import * as THREE from 'three'
import { getTheme, onTheme, type Theme } from '../lib/theme'

// Theme-aware materials. Every solid is toon-shaded: at night it glows (emissive + bloom), by day it
// reads like a cel-painted animation frame. Each helper registers itself to repaint on a theme change.
export type Pair = [dark: THREE.ColorRepresentation, light: THREE.ColorRepresentation]

export const light = () => getTheme() === 'light'

/** Run `fn` now and again on every theme change. */
export function themed(fn: (t: Theme) => void) {
  fn(getTheme())
  onTheme(fn)
}

// a soft three-step ramp: shadow, mid, lit — the classic painted-cel look
let ramp: THREE.DataTexture | null = null
function toonRamp() {
  if (ramp) return ramp
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255])
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter
  ramp.needsUpdate = true
  return ramp
}

export function toon(color: Pair, opts: { glow?: number; glowColor?: Pair; opacity?: number; side?: THREE.Side } = {}) {
  const m = new THREE.MeshToonMaterial({ gradientMap: toonRamp(), side: opts.side ?? THREE.FrontSide })
  if (opts.opacity !== undefined) {
    m.transparent = true
    m.opacity = opts.opacity
  }
  themed((t) => {
    const i = t === 'dark' ? 0 : 1
    m.color.set(color[i])
    // night: things glow, at about three quarters of full strength so bloom haloes them without
    // washing out their shape; day: a whisper of self-light keeps shadows from going muddy
    m.emissive.set(opts.glowColor ? opts.glowColor[i] : color[i])
    m.emissiveIntensity = t === 'dark' ? (opts.glow ?? 0.25) * 0.75 : 0.06
  })
  return m
}

export function flat(color: Pair, opacity?: number, opts: { additiveAtNight?: boolean; side?: THREE.Side } = {}) {
  const m = new THREE.MeshBasicMaterial({ side: opts.side ?? THREE.FrontSide, depthWrite: opacity === undefined })
  if (opacity !== undefined) {
    m.transparent = true
    m.opacity = opacity
  }
  themed((t) => {
    m.color.set(color[t === 'dark' ? 0 : 1])
    if (opts.additiveAtNight) {
      m.blending = t === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending
      m.needsUpdate = true
    }
  })
  return m
}

export function ink(color: Pair, opacity = 1) {
  const m = new THREE.LineBasicMaterial({ transparent: opacity < 1, opacity })
  themed((t) => m.color.set(color[t === 'dark' ? 0 : 1]))
  return m
}

/** Additive glow at night, ordinary paint by day (additive light vanishes on a bright sky). */
export function blendFor(m: THREE.Material) {
  themed((t) => {
    m.blending = t === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending
    m.needsUpdate = true
  })
}

// Shared palette pairs
export const C = {
  green: ['#39d353', '#4c8a3a'] as Pair,
  leaf: ['#26a641', '#6aa84f'] as Pair,
  cyan: ['#2ee6d6', '#3d7cb8'] as Pair,
  violet: ['#9b7bff', '#9a6fb0'] as Pair,
  gold: ['#f5b84b', '#e0a43a'] as Pair,
  red: ['#ff6b5a', '#c8553d'] as Pair,
  ink: ['#e8efe9', '#3b3226'] as Pair,
  soft: ['#9fb0a8', '#7a6e5c'] as Pair,
  paper: ['#1a2420', '#fbf3df'] as Pair,
  body: ['#0b1512', '#f3ead2'] as Pair,
  dark: ['#081018', '#8d6e4f'] as Pair,
  wood: ['#3a2a20', '#9c6b43'] as Pair,
  white: ['#d9ffe4', '#fffaf0'] as Pair,
}

/** A text label as a camera-facing sprite, repainted for each theme. */
const INDIC = '"Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Kannada", "Noto Sans Bengali", "Noto Sans Telugu", "Noto Sans Gurmukhi"'

/** A label painted onto a flat surface (it does not turn to face the camera), e.g. a shop sign. */
export function flatLabel(text: string, o: Parameters<typeof label>[1] = {}) {
  const sprite = label(text, o)
  const mat = new THREE.MeshBasicMaterial({ map: sprite.material.map, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
  // follow the sprite's size, which tracks the text width across theme and font changes
  mesh.onBeforeRender = () => mesh.scale.copy(sprite.scale)
  mesh.scale.copy(sprite.scale)
  return mesh
}

export function label(
  initialText: string,
  o: { size?: number; height?: number; color?: Pair; bg?: Pair | null; font?: 'mono' | 'display' | 'body'; weight?: number } = {},
) {
  const { size = 56, height = 0.5, color = C.ink, bg = null, font = 'mono', weight = 500 } = o
  let text = initialText
  const base = font === 'mono' ? '"JetBrains Mono", ui-monospace, monospace' : font === 'display' ? '"Unbounded", "Manrope", sans-serif' : '"Manrope", system-ui, sans-serif'
  // Indian scripts get real fonts (with correct matra shaping) instead of whatever the OS falls back to
  const fam = `${base.replace(/, (ui-monospace|system-ui|sans-serif|monospace)$/, '')}, ${INDIC}, ${base.split(', ').pop()}`
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true })
  const s = new THREE.Sprite(mat)
  s.userData.height = height
  const draw = (t: Theme) => {
    const i = t === 'dark' ? 0 : 1
    const fontFam = t === 'light' && font === 'display' ? '"Fraunces", Georgia, serif' : fam
    const f = `${weight} ${size}px ${fontFam}`
    ctx.font = f
    const pad = size * 0.55
    const w = Math.ceil(ctx.measureText(text).width + pad * 2)
    const h = Math.ceil(size * 1.6)
    // WebGL allocates the texture at its first size; a resized canvas must get a fresh texture, or the
    // upload fails and the label flashes stale pixels
    if ((c.width !== w || c.height !== h) && c.width > 0) tex.dispose()
    c.width = w
    c.height = h
    ctx.font = f
    if (bg) {
      ctx.fillStyle = String(bg[i])
      ctx.beginPath()
      ctx.roundRect(0, 0, w, h, h / 2)
      ctx.fill()
    }
    ctx.fillStyle = String(color[i])
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(text, w / 2, h / 2 + size * 0.04)
    tex.needsUpdate = true
    s.userData.aspect = w / h
    s.scale.set(height * s.userData.aspect * (s.userData.k ?? 1), height * (s.userData.k ?? 1), 1)
  }
  themed(draw)
  // fonts may arrive after the first paint
  document.fonts?.ready.then(() => draw(getTheme()))
  // canvas text does not trigger web-font downloads by itself: ask for the script fonts this text needs
  if (/[\u0900-\u0DFF\u0A00-\u0A7F]/.test(initialText))
    document.fonts?.load(`${weight} ${size}px ${INDIC}`, initialText).then(() => draw(getTheme()), () => {})
  s.userData.setText = (next: string) => {
    if (next === text) return
    text = next
    draw(getTheme())
  }
  return s
}

/** Grow or shrink a label without distorting it (sprite scale also carries its aspect ratio). */
export function pulse(s: THREE.Sprite, k: number) {
  s.userData.k = k
  const h = s.userData.height as number
  s.scale.set(h * (s.userData.aspect as number) * k, h * k, 1)
}

/** Change a label's text later (e.g. a ticking counter). */
export const relabel = (s: THREE.Sprite, text: string) => (s.userData.setText as (t: string) => void)(text)

export function softDot(size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.75)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}
