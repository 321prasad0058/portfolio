import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { FocusBlurPass } from './FocusBlur'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { education, flexiloans, pillars, stack as stackData } from '../data/profile'
import type { Calendar } from '../lib/activity'
import { FrameGuard, coarsePointer, getTier, onTier, reducedMotion, setTier } from '../lib/perf'
import { getTheme, onTheme, type Theme } from '../lib/theme'
import { createAcademy } from './pieces/Academy'
import { createCommitLine } from './pieces/CommitLine'
import { createCore } from './pieces/Core'
import { createFlexi } from './pieces/Flexi'
import { createGraph, type GraphPiece } from './pieces/Graph'
import { createLeetCode, type LeetPiece } from './pieces/LeetCode'
import { createKosha, createTranscribo, createVana } from './pieces/Projects'
import { createClouds, createDrift, createSky } from './pieces/Sky'
import { createPortal, createSpace } from './pieces/Space'
import { createStack, type StackPiece } from './pieces/Stack'
import { damp, smooth, type FrameCtx, type Piece } from './util'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Space kept above a section's content when it is in view: the nav bar plus a little air. */
export const TOP_GAP = () => (innerWidth >= 900 ? 96 : 72)

/** Scroll position at which a story section's content top sits just under the nav. */
export function stopTop(section: HTMLElement) {
  const anchor = section.querySelector<HTMLElement>('.wrap > :first-child') ?? section
  return docTop(anchor) - TOP_GAP()
}

/** Layout position in the document, ignoring transforms (reveal animations shift elements while hidden). */
export function docTop(el: HTMLElement) {
  let y = 0
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop
  return y
}

// Night glow, per stop (strength, radius, threshold). The hero keeps its full shine; the activity
// section is calmer; everything else sits in between. Blended as the camera travels.
type Glow = [number, number, number]
const GLOW_DEFAULT: Glow = [0.6, 0.5, 0.38]
const GLOW: Record<string, Glow> = {
  hello: [0.62, 0.5, 0.32],
  proof: [0.36, 0.4, 0.56],
  leetcode: [0.36, 0.4, 0.56],
}
// stops where one project is shown up close: at night, everything beyond this radius (in world units,
// around the camera's focus point) falls out of focus — big enough to hold that whole model
const FOCUS_RADIUS: Record<string, number> = {
  cjp: 13,
  mcp: 9.5, flexy: 9.5, guarantor: 12, credit: 8.5,
  kosha: 6.5, vana: 6.5, transcribo: 6.5,
}

// Where each set-piece lives. The journey runs down -z, swinging left and right.
const AT = {
  hello: V(0, 0, 0),
  flexi: V(-4, 0, -52),
  vana: V(16, -0.5, -95),
  kosha: V(26, 1, -114),
  transcribo: V(16, 0.5, -133),
  graph: V(0, -2, -168),
  leetcode: V(-16, 0.5, -198),
  academy: V(12, 2, -228),
  stack: V(-2, 0, -258),
  contact: V(0, 0, -302),
}

/** A camera pose: look at `target` from direction `dir`, far enough to fit `fit` (w × h) on screen. */
type Key = {
  target: THREE.Vector3
  dir: THREE.Vector3
  fit: [number, number]
  side: number
  mobileFit?: [number, number]
  mobile?: { target: THREE.Vector3; dir: THREE.Vector3 }
}


export type WorldOptions = {
  stops: HTMLElement[]
  onCursor?: (label: string | null) => void
}

export class World {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 800)
  private composer?: EffectComposer
  private bloom?: UnrealBloomPass
  private dof?: FocusBlurPass
  private pieces: Piece[] = []
  private graph: GraphPiece
  private leet: LeetPiece
  private stack: StackPiece
  private keys: Record<string, Key>
  private stopIds: string[]
  private stopY: number[] = []
  private story = 0
  private pointer = new THREE.Vector2()
  private pointerSmooth = new THREE.Vector2()
  private overUI = false
  private hasPointer = false
  private dragging = false
  private intro = 1
  private camPos = new THREE.Vector3()
  private camLook = new THREE.Vector3()
  private width = 1
  private height = 1
  private wide = true
  private guard = new FrameGuard(() => setTier('low'))
  private clock = new THREE.Timer()
  private time = 0
  private cursorLabel: string | null = null
  private offs: (() => void)[] = []
  private ctx: FrameCtx
  private hemi = new THREE.HemisphereLight()
  private key = new THREE.DirectionalLight()

  constructor(canvas: HTMLCanvasElement, private opts: WorldOptions) {
    const low = getTier() === 'low'
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !low && devicePixelRatio < 2, powerPreference: 'high-performance' })
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    this.key.position.set(5, 10, 8)
    this.scene.add(this.hemi, this.key)

    this.stopIds = opts.stops.map((s) => s.dataset.stop!)

    const graph = createGraph(AT.graph)
    const leet = createLeetCode(AT.leetcode)
    const flexi = createFlexi(
      AT.flexi,
      flexiloans.scenes,
      flexiloans.scenes.map((_, i) => flexiloans.systems.filter((s) => s.scene === i).map((s) => s.stop)),
    )
    const stack = createStack(AT.stack, Object.values(stackData))
    this.graph = graph
    this.leet = leet
    this.stack = stack
    const under = (p: THREE.Vector3, dy: number, dz = 0) => p.clone().add(V(0, dy, dz))
    const fork = V(6, -3.2, -84)
    const merge = V(4, -3.6, -150)
    this.pieces = [
      createSky(),
      createClouds(30, -340, low ? 18 : 34),
      createDrift(low ? 120 : 260),
      createSpace(low ? 2200 : 5200, 30, -340),
      createCommitLine(
        [V(0, -3.6, 30), under(AT.hello, -3.6, 1), under(AT.flexi, -4.6, 0), fork, V(7, -3.8, -114), merge, V(0, -3.2, -164.2), under(AT.leetcode, -4.4), under(AT.academy, -4.6), under(AT.stack, -5.8), V(0, -1.8, -288), AT.contact.clone().add(V(0, 0, -1))],
        [fork, under(AT.vana, -2.6), under(AT.kosha, -3), under(AT.transcribo, -3.1), merge],
        [
          { at: under(AT.hello, -3.6, 1), hash: 'a1f3c20' },
          { at: under(AT.flexi, -4.6), hash: 'f1e8a5e' },
          { at: under(AT.kosha, -3), hash: 'kosha' },
          { at: under(AT.vana, -2.6), hash: 'vana' },
          { at: under(AT.transcribo, -3.1), hash: 'transcribo' },
          { at: V(0, -3.2, -164.2), hash: 'c0de400' },
          { at: under(AT.leetcode, -4.4), hash: 'lc-581' },
          { at: under(AT.academy, -4.6), hash: '7b2e91d' },
          { at: under(AT.stack, -5.8), hash: '5ac7e11' },
        ],
      ),
      createCore(AT.hello, low ? 7000 : 18000, pillars.map((p) => p.name)),
      flexi,
      createKosha(AT.kosha),
      createVana(AT.vana),
      createTranscribo(AT.transcribo),
      graph,
      leet,
      createAcademy(AT.academy, education.coursework),
      stack,
      createPortal(AT.contact, low ? 1500 : 4000),
    ]
    for (const p of this.pieces) this.scene.add(p.group)

    // where the camera looks within each production scene (in that scene's own coordinates)
    const sceneKey = (i: number, local: THREE.Vector3, fit: [number, number], lift = 0.28): Key => ({
      target: flexi.focus(i, local),
      dir: flexi.outward(i).add(V(0, lift, 0)),
      fit,
      side: 1,
      mobileFit: [fit[0] * 0.9, fit[1] * 1.9],
    })
    const local: Record<string, Key> = {
      // the whole portal in one frame: the journey track and the dashboard above it
      cjp: sceneKey(0, V(0, 1.9, -0.5), [21, 11], 0.18),
      mcp: sceneKey(1, V(-2.4, 0.3, 0), [15.5, 8]),
      flexy: sceneKey(2, V(0.6, 0.2, 0), [11.5, 7.5]),
      // parser: sceneKey(3, V(0, 0.2, 0), [11.5, 7.5]), // parked
      guarantor: sceneKey(3, V(-0.2, 0.55, -0.3), [19.5, 8.5], 0.14),
      credit: sceneKey(4, V(0.6, 0.2, 0), [13.5, 7.5]),
    }
    this.keys = {
      hello: { target: AT.hello, dir: V(0, 0.04, 1), fit: [8.4, 8.4], side: 1, mobileFit: [8.4, 12] },
      // the system map: the FlexiLoans hub with its five systems in a ring around it, from above
      // the system map from the top: the FlexiLoans logo faces straight up at the camera
      flx: { target: AT.flexi.clone().add(V(0, 0, 3)), dir: V(0, 1.15, 1), fit: [62, 28], side: 1, mobileFit: [44, 66] },
      ...local,
      kosha: { target: AT.kosha.clone().add(V(-0.4, 0, 0)), dir: V(0.15, 0.2, 1), fit: [10.5, 7.5], side: -1, mobileFit: [9.5, 12] },
      vana: { target: AT.vana, dir: V(-0.15, 0.5, 1), fit: [9.5, 7.5], side: 1, mobileFit: [9, 12] },
      transcribo: { target: AT.transcribo, dir: V(-0.1, 0.25, 1), fit: [9.8, 7], side: 1, mobileFit: [9.5, 12] },
      proof: {
        target: AT.graph.clone().add(V(0, 2.4, 0)),
        dir: V(0, 0.5, 1),
        fit: [22, 13],
        side: 0,
        mobileFit: [9, 26],
        mobile: { target: AT.graph.clone().add(V(0, 4.2, 0)), dir: V(0.95, 0.75, 0.45) },
      },
      leetcode: { target: AT.leetcode, dir: V(0.2, 0.18, 1), fit: [9.5, 9], side: 1, mobileFit: [9.5, 13] },
      origin: { target: AT.academy, dir: V(0.25, 0.12, 1), fit: [13.5, 12], side: 1, mobileFit: [10, 15] },
      stack: { target: AT.stack, dir: V(0, 0.08, 1), fit: [12, 12], side: 1, mobileFit: [11, 14] },
      contact: { target: AT.contact, dir: V(0, 0, 1), fit: [15, 15], side: 0, mobileFit: [9, 18] },
    }
    for (const k of Object.values(this.keys)) {
      k.dir.normalize()
      k.mobile?.dir.normalize()
    }

    const storyOf = (id: string) => Math.max(0, this.stopIds.indexOf(id))
    this.ctx = { camera: this.camera, pointer: this.pointerSmooth, story: 0, storyOf }

    this.resize()
    this.applyTier()
    this.applyTheme(getTheme())
    this.offs.push(onTier(() => this.applyTier()))
    this.offs.push(onTheme((t) => this.applyTheme(t)))
    const onResize = () => {
      this.resize()
      this.layout()
    }
    addEventListener('resize', onResize)
    this.offs.push(() => removeEventListener('resize', onResize))
    this.bindPointer()
    if (reducedMotion) this.intro = 0
  }

  /** Measure where each story stop sits in the page; call after layout changes. */
  layout() {
    // each stop is where the top of its section's content (heading or card) sits just under the nav
    const max = document.documentElement.scrollHeight - innerHeight
    let prev = 0
    this.stopY = this.opts.stops.map((el, i) => {
      if (i === 0) return 0
      const y = Math.min(max, Math.max(prev, stopTop(el)))
      prev = y
      return y
    })
  }

  /** Scroll positions of the story stops (for snapping). */
  get stops() {
    return this.stopY
  }

  /** Precompile every shader so the first pass through each chapter does not hitch. */
  async warm() {
    await this.renderer.compileAsync(this.scene, this.camera)
  }

  setCalendar(cal: Calendar) {
    this.graph.setCalendar(cal)
  }

  setLeetCode(d: Parameters<LeetPiece['setData']>[0]) {
    this.leet.setData(d)
  }

  playIntro(duration = 2.6) {
    if (reducedMotion) {
      this.intro = 0
      return
    }
    const start = performance.now()
    const from = this.intro
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / (duration * 1000))
      this.intro = from * Math.pow(1 - t, 4)
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  get storyIndex() {
    return this.story
  }

  private applyTheme(t: Theme) {
    const day = t === 'light'
    const bg = new THREE.Color(day ? '#d6e8ee' : '#04060b')
    this.scene.background = bg
    this.scene.fog = new THREE.FogExp2(bg, day ? 0.011 : 0.02)
    this.renderer.setClearColor(bg, 1)
    this.renderer.toneMapping = day ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = day ? 1.0 : 0.95
    this.hemi.color.set(day ? '#fff6e0' : '#bfffe0')
    this.hemi.groundColor.set(day ? '#8fb7d6' : '#05060a')
    this.hemi.intensity = day ? 1.2 : 0.85
    this.key.color.set(day ? '#fff0d2' : '#ffffff')
    this.key.intensity = day ? 2.0 : 1.4
    if (this.bloom) this.bloom.enabled = !day
  }

  /** Draw one frame immediately (used for the theme-change transition). */
  renderNow() {
    if (this.composer) this.composer.render(0)
    else this.renderer.render(this.scene, this.camera)
  }

  private applyTier() {
    const low = getTier() === 'low'
    // touch devices: their screens are dense but their GPUs are small, so cap the pixel ratio lower
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : coarsePointer ? 1.5 : 1.75))
    if (!low && !this.composer) {
      this.composer = new EffectComposer(this.renderer)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      // depth of field: a second, depth-only render; switched on only while a project is in focus
      this.dof = new FocusBlurPass(this.scene, this.camera)
      this.dof.enabled = false
      this.composer.addPass(this.dof)
      this.bloom = new UnrealBloomPass(new THREE.Vector2(this.width / 2, this.height / 2), ...GLOW_DEFAULT)
      this.bloom.enabled = getTheme() === 'dark'
      this.composer.addPass(this.bloom)
      this.composer.addPass(new OutputPass())
    }
    if (low && this.composer) {
      this.composer.dispose()
      this.composer = undefined
      this.bloom = undefined
      this.dof = undefined
    }
    this.resize()
  }

  private resize() {
    this.width = innerWidth
    this.height = innerHeight
    this.wide = this.width >= 900 && this.width / this.height > 1.1
    this.renderer.setSize(this.width, this.height, false)
    this.composer?.setSize(this.width, this.height)
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }

  private bindPointer() {
    const move = (e: PointerEvent) => {
      this.hasPointer = e.pointerType === 'mouse'
      this.pointer.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1)
      this.overUI = !!(e.target as Element | null)?.closest?.('[data-ui], a, button')
      if (this.dragging) this.stack.drag(e.movementX, e.movementY)
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || this.overUI) return
      if (Math.abs(this.story - this.ctx.storyOf('stack')) < 0.45) this.dragging = true
    }
    const up = () => {
      this.dragging = false
    }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    this.offs.push(() => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
    })
  }

  private readStory() {
    const y = scrollY
    const s = this.stopY
    if (s.length < 2 || y <= s[0]) return 0
    for (let i = 0; i < s.length - 1; i++) {
      if (y < s[i + 1]) {
        const t = (y - s[i]) / Math.max(1, s[i + 1] - s[i])
        // hold on each stop while its text is read, travel in between
        return i + smooth(0.16, 0.84, t)
      }
    }
    return s.length - 1
  }

  private pose(id: string, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const k = this.keys[id] ?? this.keys.hello
    const [fw, fh] = !this.wide && k.mobileFit ? k.mobileFit : k.fit
    const vfov = THREE.MathUtils.degToRad(this.camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect)
    // with text beside it, the subject gets a little over half the width
    const usable = this.wide && k.side ? 0.56 : 1
    const dist = Math.max(fw / 2 / Math.tan((hfov * usable) / 2), fh / 2 / Math.tan(vfov / 2))
    const m = !this.wide && k.mobile ? k.mobile : k
    outPos.copy(m.target).addScaledVector(m.dir, dist)
    outLook.copy(m.target)
    return this.wide ? k.side : 0
  }

  private tmpA = new THREE.Vector3()
  private tmpB = new THREE.Vector3()
  private tmpC = new THREE.Vector3()
  private tmpD = new THREE.Vector3()

  tick() {
    this.clock.update()
    const dt = Math.min(this.clock.getDelta(), 0.1)
    this.time += dt
    this.guard.tick(dt * 1000)

    const target = this.readStory()
    this.story += (target - this.story) * (reducedMotion ? 1 : damp(7, dt))
    if (Math.abs(target - this.story) < 1e-4) this.story = target
    this.ctx.story = this.story
    this.pointerSmooth.lerp(this.pointer, damp(5, dt))

    const i = Math.min(Math.floor(this.story), this.stopIds.length - 1)
    const j = Math.min(i + 1, this.stopIds.length - 1)
    const f = this.story - i
    const sa = this.pose(this.stopIds[i], this.tmpA, this.tmpB)
    const sb = this.pose(this.stopIds[j], this.tmpC, this.tmpD)
    const travel = this.tmpA.distanceTo(this.tmpC)
    this.camPos.lerpVectors(this.tmpA, this.tmpC, f)
    // arc upward on long flights, so travelling feels like flying
    this.camPos.y += Math.sin(f * Math.PI) * Math.min(travel * 0.12, 6)
    this.camLook.lerpVectors(this.tmpB, this.tmpD, f)
    const side = THREE.MathUtils.lerp(sa, sb, f)

    this.camPos.z += this.intro * 26
    this.camPos.y += this.intro * 6

    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)
    this.camera.translateX(this.pointerSmooth.x * 0.45)
    this.camera.translateY(this.pointerSmooth.y * 0.28)
    this.camera.lookAt(this.camLook)
    // lens shift: move the subject sideways without turning the camera
    this.camera.setViewOffset(this.width, this.height, -side * 0.22 * this.width, 0, this.width, this.height)

    this.post(this.stopIds[i], this.stopIds[j], f)

    for (const p of this.pieces) {
      const near = p.radius === Infinity || this.camera.position.distanceTo(p.center) - p.radius < 85
      p.group.visible = near && p.group.userData.hidden !== true
      if (near) p.update(this.time, dt, this.ctx)
    }

    this.hover()
    this.renderNow()
  }

  /** Per-stop night glow, and the depth-of-field that isolates the project in view. */
  private post(a: string, b: string, f: number) {
    const night = getTheme() === 'dark'
    // thinner haze over the FlexiLoans system map, so the far side of the ring stays clear
    const fog = this.scene.fog as THREE.FogExp2
    const clear = (a === 'flx' ? 1 - f : 0) + (b === 'flx' ? f : 0)
    fog.density = (night ? 0.02 : 0.011) * (1 - clear * 0.65)
    if (this.bloom) {
      const ga = GLOW[a] ?? GLOW_DEFAULT
      const gb = GLOW[b] ?? GLOW_DEFAULT
      this.bloom.strength = THREE.MathUtils.lerp(ga[0], gb[0], f)
      this.bloom.radius = THREE.MathUtils.lerp(ga[1], gb[1], f)
      this.bloom.threshold = THREE.MathUtils.lerp(ga[2], gb[2], f)
    }
    if (this.dof) {
      // full blur while parked on a project, easing out as the camera leaves for a non-project stop
      const ra = FOCUS_RADIUS[a]
      const rb = FOCUS_RADIUS[b]
      const w = (ra ? 1 - f : 0) + (rb ? f : 0)
      this.dof.enabled = night && w > 0.02 && !coarsePointer
      const u = this.dof.uniforms
      u.uRadius.value = ra && rb ? THREE.MathUtils.lerp(ra, rb, f) : (ra ?? rb ?? 7)
      u.uMaxBlur.value = 0.019 * w
      this.camera.updateMatrixWorld()
      this.dof.focusWorld.copy(this.camLook)
      u.uFocus.value.copy(this.camLook).applyMatrix4(this.camera.matrixWorldInverse)
    }
  }

  private hover() {
    // the activity graph just rises when you arrive; there is no per-day readout
    if (Math.abs(this.story - this.ctx.storyOf('proof')) < 0.6) this.graph.arrive()
    let label: string | null = null
    if (Math.abs(this.story - this.ctx.storyOf('stack')) < 0.45 && this.hasPointer && !this.overUI) label = this.dragging ? 'spin' : 'drag'
    if (label !== this.cursorLabel) {
      this.cursorLabel = label
      this.opts.onCursor?.(label)
    }
  }

  dispose() {
    this.offs.forEach((o) => o())
    this.pieces.forEach((p) => p.dispose?.())
    this.composer?.dispose()
    this.renderer.dispose()
  }
}
