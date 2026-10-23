import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

// Isolates one model: every pixel whose 3D position lies within `radius` of the focus point stays sharp;
// beyond it, blur grows over `ramp` units up to `maxBlur`. Distance is measured in 3D (from a depth
// pre-pass), not along the view axis, so the whole model — near side and far side — stays crisp.
// In-focus pixels are left out of their neighbours' blur, so the model never smears into the background.
// For speed the depth pre-pass and the blur both run at half resolution; one cheap full-resolution
// pass then mixes the sharp frame with the blurred one by the focus mask.
export class FocusBlurPass extends Pass {
  private depthTarget: THREE.WebGLRenderTarget
  private blurTarget = new THREE.WebGLRenderTarget(1, 1)
  private composite: FullScreenQuad
  private depthMat = new THREE.MeshBasicMaterial({ colorWrite: false })
  private lineDepthMat = new THREE.LineBasicMaterial({ colorWrite: false })
  private swapped: [THREE.Object3D & { material: THREE.Material | THREE.Material[] }, THREE.Material | THREE.Material[]][] = []
  private quad: FullScreenQuad
  readonly uniforms = {
    tColor: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    tBlur: { value: null as THREE.Texture | null },
    uInvProj: { value: new THREE.Matrix4() },
    uFocus: { value: new THREE.Vector3() }, // view space
    uRadius: { value: 7 },
    uRamp: { value: 6 },
    uMaxBlur: { value: 0 }, // in UV units
    uAspect: { value: 1 },
  }

  /** focus point in world space (the view-space copy in `uniforms.uFocus` is derived from it) */
  readonly focusWorld = new THREE.Vector3()
  private hidden: THREE.Object3D[] = []
  private tmp = new THREE.Vector3()
  private sphere = new THREE.Sphere()

  constructor(private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    super()
    this.depthTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) })
    this.uniforms.tDepth.value = this.depthTarget.depthTexture
    this.uniforms.tBlur.value = this.blurTarget.texture
    const amountGlsl = /* glsl */ `
      uniform sampler2D tDepth; uniform mat4 uInvProj; uniform vec3 uFocus; uniform float uRadius, uRamp;
      float amount(vec2 uv){
        float d = texture2D(tDepth, uv).x;
        if (d >= 1.0) return 1.0; // empty sky: background
        vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        return smoothstep(uRadius, uRadius + uRamp, distance(p.xyz / p.w, uFocus));
      }`
    this.composite = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform sampler2D tColor, tBlur;
          ${amountGlsl}
          varying vec2 vUv;
          void main(){
            vec4 base = texture2D(tColor, vUv);
            float a = amount(vUv);
            gl_FragColor = a < 0.01 ? base : mix(base, texture2D(tBlur, vUv), smoothstep(0.0, 0.6, a));
          }`,
      }),
    )
    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform sampler2D tColor; uniform float uMaxBlur, uAspect;
          ${amountGlsl}
          varying vec2 vUv;
          void main(){
            float a = amount(vUv);
            vec4 base = texture2D(tColor, vUv);
            if (a < 0.01) { gl_FragColor = base; return; }
            float r = uMaxBlur * a;
            vec4 sum = base; float wsum = 1.0;
            float spin = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
            for (int i = 0; i < 20; i++){
              float fi = float(i) + 0.5;
              float rr = sqrt(fi / 20.0) * r;
              float th = fi * 2.39996 + spin;
              vec2 uv = vUv + vec2(cos(th) / uAspect, sin(th)) * rr;
              float w = amount(uv); // sharp (in-focus) pixels don't bleed into the blur
              sum += texture2D(tColor, uv) * w; wsum += w;
            }
            gl_FragColor = sum / wsum;
          }`,
      }),
    )
  }

  setSize(w: number, h: number) {
    const hw = Math.max(1, Math.round(w / 2))
    const hh = Math.max(1, Math.round(h / 2))
    this.depthTarget.setSize(hw, hh)
    this.blurTarget.setSize(hw, hh)
    this.uniforms.uAspect.value = w / h
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    // depth pre-pass: solid meshes everywhere; see-through things (glows, label cards, particles,
    // lines) only when they belong to the model in focus — elsewhere they'd stamp opaque boxes
    // into the depth buffer and drag the background into focus, or the model out of it
    const reach = this.uniforms.uRadius.value + this.uniforms.uRamp.value * 0.5
    const hide = (o: THREE.Object3D) => {
      o.visible = false
      this.hidden.push(o)
    }
    const swap = (o: THREE.Object3D & { material: THREE.Material | THREE.Material[] }, m: THREE.Material) => {
      this.swapped.push([o, o.material])
      o.material = m
    }
    this.scene.traverseVisible((o) => {
      const obj = o as THREE.Object3D & { material?: THREE.Material | THREE.Material[]; geometry?: THREE.BufferGeometry }
      const m = obj.material
      if (!m) return
      // particles never count: they'd blur as background, which reads as soft bokeh
      if ((o as THREE.Points).isPoints) return hide(o)
      const solid = (o as THREE.Mesh).isMesh && !(Array.isArray(m) ? m.some((x) => x.transparent) : m.transparent)
      let near = solid
      if (!near) {
        const g = obj.geometry
        if (g && !(o as THREE.Sprite).isSprite) {
          if (!g.boundingSphere) g.computeBoundingSphere()
          this.sphere.copy(g.boundingSphere!).applyMatrix4(o.matrixWorld)
          near = this.sphere.radius < reach * 1.5 && this.sphere.center.distanceTo(this.focusWorld) < reach
        } else near = o.getWorldPosition(this.tmp).distanceTo(this.focusWorld) < reach
      }
      if (!near) return hide(o)
      const target = obj as THREE.Object3D & { material: THREE.Material | THREE.Material[] }
      if ((o as THREE.Sprite).isSprite) {
        // labels keep their billboarding; only their visible glyphs and card write depth
        const sm = m as THREE.SpriteMaterial
        let dm = o.userData.depthMat as THREE.SpriteMaterial | undefined
        if (!dm || dm.map !== sm.map) {
          dm?.dispose()
          dm = new THREE.SpriteMaterial({ map: sm.map, alphaTest: 0.25, colorWrite: false, sizeAttenuation: sm.sizeAttenuation })
          o.userData.depthMat = dm
        }
        swap(target, dm)
      } else if ((o as THREE.Line).isLine) swap(target, this.lineDepthMat)
      else swap(target, this.depthMat)
    })
    const prevTarget = renderer.getRenderTarget()
    const prevBg = this.scene.background
    this.scene.background = null
    renderer.setRenderTarget(this.depthTarget)
    renderer.clear()
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(prevTarget)
    this.scene.background = prevBg
    for (const o of this.hidden) o.visible = true
    this.hidden.length = 0
    for (const [o, m] of this.swapped) o.material = m
    this.swapped.length = 0

    this.uniforms.tColor.value = readBuffer.texture
    this.uniforms.uInvProj.value.copy(this.camera.projectionMatrixInverse)
    // blur at half resolution, then mix it in at full resolution
    renderer.setRenderTarget(this.blurTarget)
    this.quad.render(renderer)
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.composite.render(renderer)
  }

  dispose() {
    this.depthTarget.dispose()
    this.blurTarget.dispose()
    this.composite.dispose()
    this.depthMat.dispose()
    this.lineDepthMat.dispose()
    this.quad.dispose()
  }
}
