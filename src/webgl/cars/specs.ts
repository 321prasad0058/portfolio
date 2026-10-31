// The five showcase cars, traced from photographs rather than drawn from memory.
//
// Method: each side profile was traced on a pixel grid from a near-true side photo and converted to metres
// using the car's published length and height (u = 0 at the tail … 1 at the nose; heights above the road).
// Lamp, grille and skid-plate outlines were traced the same way from straight-on front and rear photos,
// as [z, y]: metres across the car from the centre line, and height. Axle positions come from the photos.
// No logos, badges or lettering are modelled. On the site these cars stand in for body styles, unnamed.
import type { CarSpec } from './build'

/** Electric SUV — Tata Sierra.ev (2026). 4340 × 1841 × 1715. */
export const SIERRA_EV: CarSpec = {
  id: 'tata-sierra-ev',
  name: 'Tata Sierra.ev',
  L: 4.34, W: 1.841, H: 1.715,
  axles: [0.1685, 0.835],
  tyreR: 0.365, tyreW: 0.235, rim: 0.7, wheel: { style: 'blade', spokes: 5 },
  archGap: 0.04, archSquare: 0.7,
  sill: [[0, 0.28], [0.01, 0.265], [0.05, 0.27], [0.12, 0.25], [0.28, 0.217], [0.68, 0.217], [0.9, 0.24], [0.969, 0.235], [0.99, 0.225], [1, 0.25]],
  top: [[0, 1.12], [0.008, 1.2], [0.035, 1.223], [0.203, 1.219], [0.356, 1.206], [0.586, 1.188], [0.709, 1.179], [0.739, 1.172], [0.893, 1.095], [0.975, 1.03], [0.988, 1.005], [1, 0.95]],
  width: [[0, 0.84], [0.01, 0.9], [0.03, 0.95], [0.07, 0.985], [0.12, 0.997], [0.5, 1], [0.88, 0.997], [0.93, 0.985], [0.97, 0.95], [0.99, 0.9], [1, 0.84]],
  crown: 0.015,
  bulge: 0.008,
  shoulder: { y: [[0, 0.93], [1, 0.9]], inset: 0.05 },
  greenhouse: {
    u0: 0.03, u1: 0.709, tumble: 0.88,
    top: [[0.03, 1.22], [0.033, 1.45], [0.04, 1.6], [0.06, 1.665], [0.1034, 1.693], [0.203, 1.69], [0.3946, 1.684], [0.5556, 1.657], [0.586, 1.607], [0.65, 1.39], [0.709, 1.179]],
  },
  roof: { u0: 0.2, u1: 0.57, black: true },
  alpine: [0.035, 0.2],
  pillars: [
    { bottom: [0.03, 0.045], top: [0.035, 0.05], black: true },
    { bottom: [0.198, 0.21], top: [0.198, 0.21], black: true },
    // the signature body-coloured fin between the rear door glass and the B-pillar
    { bottom: [0.364, 0.452], top: [0.39, 0.44], black: false },
    { bottom: [0.448, 0.462], top: [0.44, 0.452], black: true },
  ],
  cladding: { top: [[0, 0.62], [0.05, 0.6], [0.3, 0.569], [0.7, 0.569], [0.95, 0.6], [1, 0.66]], flare: 0.15 },
  doors: [[0.203, 0.203], [0.452, 0.448], [0.706, 0.69]],
  front: [
    { mat: 'gloss', poly: [[-0.88, 0.98], [0.88, 0.98], [0.88, 1.008], [-0.88, 1.008]] },
    { mat: 'drl', poly: [[-0.86, 0.988], [0.86, 0.988], [0.86, 1.0], [-0.86, 1.0]], layer: 1 },
    { mat: 'gloss', mirror: true, poly: [[0.493, 0.87], [0.72, 0.87], [0.72, 0.832], [0.52, 0.832]] },
    { mat: 'head', mirror: true, poly: [[0.53, 0.858], [0.7, 0.858], [0.7, 0.847], [0.54, 0.847]], layer: 1 },
    { mat: 'gloss', poly: [[-0.72, 0.82], [-0.45, 0.8], [0, 0.735], [0.45, 0.8], [0.72, 0.82], [0.72, 0.79], [0.45, 0.77], [0, 0.705], [-0.45, 0.77], [-0.72, 0.79]] },
    { mat: 'trim', poly: [[-0.93, 0.7], [0.93, 0.7], [0.93, 0.24], [-0.93, 0.24]] },
    { mat: 'slats', poly: [[-0.45, 0.54], [0.45, 0.54], [0.45, 0.4], [-0.45, 0.4]], layer: 1 },
    { mat: 'head', mirror: true, poly: [[0.82, 0.645], [0.855, 0.645], [0.855, 0.58], [0.82, 0.58]], layer: 1 },
    {
      mat: 'silver',
      layer: 1,
      poly: [[-0.7, 0.23], [0.7, 0.23], [0.745, 0.33], [0.695, 0.385], [0.59, 0.533], [0.433, 0.533], [0.4, 0.385], [-0.4, 0.385], [-0.433, 0.533], [-0.59, 0.533], [-0.695, 0.385], [-0.745, 0.33]],
    },
  ],
  rear: [
    { mat: 'gloss', poly: [[-0.9, 1.155], [0.9, 1.155], [0.9, 1.19], [-0.9, 1.19]] },
    { mat: 'tail', poly: [[-0.88, 1.166], [0.88, 1.166], [0.88, 1.18], [-0.88, 1.18]], layer: 1 },
    { mat: 'silver', layer: 1, poly: [[-0.6, 0.3], [0.6, 0.3], [0.64, 0.36], [0.58, 0.4], [-0.58, 0.4], [-0.64, 0.36]] },
    { mat: 'tail', mirror: true, poly: [[0.7, 0.45], [0.8, 0.45], [0.8, 0.43], [0.7, 0.43]], layer: 1 },
  ],
  side: [
    { mat: 'gloss', poly: [[0.6, 1.1], [0.64, 1.1], [0.64, 1.115], [0.6, 1.115]] },
    { mat: 'gloss', poly: [[0.33, 1.115], [0.37, 1.115], [0.37, 1.13], [0.33, 1.13]] },
  ],
  plates: { front: 0.61, rear: 0.55 },
  rails: 'black',
  spoiler: true,
  sunroof: [0.25, 0.52],
  mirrors: 'black',
  paint: '#a3bdb6', // the launch sage-mint
  ev: true,
  plate: 'MH 01 EV 2026',
}

/** Premium hatchback — Tata Altroz (2025). 3990 × 1755 × 1523. */
export const ALTROZ: CarSpec = {
  id: 'tata-altroz',
  name: 'Tata Altroz',
  L: 3.99, W: 1.755, H: 1.523,
  axles: [0.15, 0.808],
  tyreR: 0.31, tyreW: 0.195, rim: 0.66, wheel: { style: 'turbine', spokes: 5 },
  archGap: 0.05, archSquare: 0.15,
  sill: [[0, 0.34], [0.011, 0.31], [0.059, 0.3], [0.15, 0.27], [0.329, 0.25], [0.671, 0.25], [0.928, 0.23], [0.985, 0.235], [1, 0.27]],
  top: [[0, 0.75], [0.01, 1.0], [0.021, 1.12], [0.045, 1.19], [0.07, 1.21], [0.183, 1.19], [0.231, 1.134], [0.412, 1.06], [0.685, 1.035], [0.724, 1.07], [0.8, 1.02], [0.912, 0.92], [0.993, 0.79], [1, 0.62]],
  width: [[0, 0.8], [0.01, 0.87], [0.03, 0.93], [0.07, 0.975], [0.12, 0.995], [0.5, 1], [0.88, 0.995], [0.93, 0.975], [0.97, 0.93], [0.99, 0.87], [1, 0.8]],
  crown: 0.03,
  shoulder: { y: [[0, 1.0], [0.5, 0.93], [1, 0.82]], inset: 0.06 },
  greenhouse: {
    u0: 0.06, u1: 0.724, tumble: 0.78,
    top: [[0.06, 1.21], [0.09, 1.33], [0.107, 1.409], [0.14, 1.49], [0.17, 1.52], [0.238, 1.514], [0.352, 1.515], [0.496, 1.495], [0.608, 1.36], [0.66, 1.22], [0.724, 1.06]],
  },
  roof: { u0: 0.16, u1: 0.57, black: false },
  pillars: [
    // the blacked-out C-pillar that "floats" the roof
    { bottom: [0.06, 0.204], top: [0.1, 0.23], black: true },
    { bottom: [0.397, 0.416], top: [0.397, 0.416], black: true },
  ],
  doors: [[0.204, 0.23], [0.416, 0.416], [0.69, 0.67]],
  front: [
    { mat: 'gloss', mirror: true, poly: [[0.45, 0.8], [0.84, 0.822], [0.865, 0.775], [0.66, 0.745], [0.45, 0.765]] },
    { mat: 'drl', mirror: true, poly: [[0.46, 0.796], [0.83, 0.816], [0.835, 0.806], [0.47, 0.787]], layer: 1 },
    { mat: 'head', mirror: true, poly: [[0.58, 0.772], [0.68, 0.776], [0.68, 0.758], [0.58, 0.755]], layer: 1 },
    { mat: 'gloss', poly: [[-0.45, 0.787], [0.45, 0.787], [0.45, 0.765], [-0.45, 0.765]] },
    { mat: 'mesh', poly: [[-0.55, 0.62], [0.55, 0.62], [0.62, 0.34], [-0.62, 0.34]] },
    { mat: 'gloss', mirror: true, poly: [[0.66, 0.64], [0.78, 0.66], [0.8, 0.4], [0.7, 0.42]] },
    { mat: 'head', mirror: true, poly: [[0.71, 0.6], [0.74, 0.6], [0.74, 0.5], [0.71, 0.5]], layer: 1 },
  ],
  rear: [
    { mat: 'gloss', poly: [[-0.84, 1.14], [0.84, 1.14], [0.86, 1.06], [-0.86, 1.06]] },
    { mat: 'tail', poly: [[-0.82, 1.106], [0.82, 1.106], [0.82, 1.095], [-0.82, 1.095]], layer: 1 },
    { mat: 'tail', mirror: true, poly: [[0.72, 1.13], [0.84, 1.13], [0.86, 1.07], [0.74, 1.07]], layer: 1 },
    { mat: 'trim', poly: [[-0.8, 0.45], [0.8, 0.45], [0.75, 0.33], [-0.75, 0.33]] },
  ],
  plates: { front: 0.5, rear: 0.6 },
  spoiler: true,
  mirrors: 'black',
  paint: '#d9481f', // Ember Glow
  plate: 'MH 12 SC 2026',
}

/** Sedan — Honda City (2026 facelift). 4594 × 1748 × 1489. */
export const CITY: CarSpec = {
  id: 'honda-city',
  name: 'Honda City',
  L: 4.594, W: 1.748, H: 1.489,
  axles: [0.2005, 0.8035],
  tyreR: 0.305, tyreW: 0.185, rim: 0.68, wheel: { style: 'twin', spokes: 5 },
  archGap: 0.05, archSquare: 0,
  sill: [[0, 0.32], [0.015, 0.29], [0.06, 0.27], [0.25, 0.23], [0.75, 0.23], [0.95, 0.24], [0.985, 0.25], [1, 0.28]],
  top: [[0, 1.04], [0.014, 1.12], [0.0236, 1.137], [0.1047, 1.177], [0.289, 1.1], [0.4364, 1.086], [0.6207, 1.052], [0.7165, 1.029], [0.768, 1.001], [0.879, 0.893], [0.968, 0.782], [0.982, 0.731], [1, 0.63]],
  width: [[0, 0.8], [0.01, 0.87], [0.03, 0.93], [0.07, 0.975], [0.12, 0.995], [0.5, 1], [0.88, 0.995], [0.93, 0.975], [0.97, 0.93], [0.99, 0.87], [1, 0.8]],
  crown: 0.025,
  shoulder: { y: [[0, 0.99], [0.5, 0.95], [1, 0.76]], inset: 0.06 },
  greenhouse: {
    u0: 0.1047, u1: 0.7165, tumble: 0.74,
    top: [[0.1047, 1.177], [0.156, 1.255], [0.2153, 1.357], [0.274, 1.441], [0.348, 1.494], [0.4364, 1.4995], [0.51, 1.475], [0.569, 1.39], [0.64, 1.2], [0.7165, 1.029]],
  },
  roof: { u0: 0.3, u1: 0.52, black: false },
  pillars: [
    { bottom: [0.105, 0.25], top: [0.205, 0.27], black: false },
    { bottom: [0.352, 0.36], top: [0.342, 0.35], black: true },
    { bottom: [0.4253, 0.4548], top: [0.4253, 0.4548], black: true },
  ],
  doors: [[0.36, 0.35], [0.4548, 0.4548], [0.7, 0.69]],
  windowChrome: true,
  front: [
    { mat: 'gloss', mirror: true, poly: [[0.52, 0.755], [0.8, 0.8], [0.865, 0.775], [0.84, 0.735], [0.55, 0.725]] },
    { mat: 'drl', mirror: true, poly: [[0.53, 0.752], [0.8, 0.792], [0.8, 0.783], [0.53, 0.745]], layer: 1 },
    { mat: 'head', mirror: true, poly: [[0.7, 0.766], [0.76, 0.776], [0.76, 0.756], [0.7, 0.748]], layer: 1 },
    { mat: 'chrome', poly: [[-0.53, 0.748], [0.53, 0.748], [0.53, 0.761], [-0.53, 0.761]], layer: 1 },
    { mat: 'mesh', poly: [[-0.56, 0.735], [0.56, 0.735], [0.48, 0.64], [-0.48, 0.64]] },
    { mat: 'mesh', poly: [[-0.62, 0.52], [0.62, 0.52], [0.58, 0.3], [-0.58, 0.3]] },
    { mat: 'gloss', mirror: true, poly: [[0.64, 0.56], [0.72, 0.575], [0.74, 0.3], [0.67, 0.3]] },
    { mat: 'chrome', mirror: true, poly: [[0.62, 0.55], [0.64, 0.56], [0.67, 0.3], [0.65, 0.3]], layer: 1 },
  ],
  rear: [
    { mat: 'gloss', mirror: true, poly: [[0.36, 1.02], [0.82, 1.04], [0.86, 1.0], [0.84, 0.96], [0.4, 0.98]] },
    { mat: 'tail', mirror: true, poly: [[0.4, 1.005], [0.8, 1.022], [0.8, 1.008], [0.4, 0.993]], layer: 1 },
    { mat: 'tail', mirror: true, poly: [[0.78, 1.0], [0.84, 1.0], [0.84, 0.97], [0.78, 0.97]], layer: 1 },
    { mat: 'trim', poly: [[-0.7, 0.42], [0.7, 0.42], [0.66, 0.3], [-0.66, 0.3]] },
    { mat: 'tail', mirror: true, poly: [[0.78, 0.48], [0.8, 0.48], [0.8, 0.38], [0.78, 0.38]], layer: 1 },
  ],
  plates: { front: 0.57, rear: 0.9 },
  mirrors: 'body',
  paint: '#4a4f56', // Meteoroid Grey
  plate: 'DL 3C SC 2026',
}

/** Mid-size SUV — Maruti Suzuki Victoris (2025). 4360 × 1795 × 1655. */
export const VICTORIS: CarSpec = {
  id: 'maruti-victoris',
  name: 'Maruti Suzuki Victoris',
  L: 4.36, W: 1.795, H: 1.655,
  axles: [0.188, 0.7957],
  tyreR: 0.345, tyreW: 0.215, rim: 0.66, wheel: { style: 'turbine', spokes: 5 },
  archGap: 0.065, archSquare: 0.5,
  sill: [[0, 0.3], [0.012, 0.285], [0.052, 0.28], [0.15, 0.26], [0.3, 0.254], [0.7, 0.254], [0.914, 0.253], [0.98, 0.26], [0.993, 0.26], [1, 0.29]],
  top: [[0, 1.08], [0.0122, 1.158], [0.024, 1.175], [0.0834, 1.175], [0.2418, 1.165], [0.4396, 1.144], [0.637, 1.13], [0.7245, 1.159], [0.748, 1.152], [0.8828, 1.081], [0.9857, 0.977], [1, 0.9]],
  width: [[0, 0.84], [0.01, 0.9], [0.03, 0.95], [0.07, 0.985], [0.12, 0.997], [0.5, 1], [0.88, 0.997], [0.93, 0.985], [0.97, 0.95], [0.99, 0.9], [1, 0.84]],
  crown: 0.03,
  shoulder: { y: [[0, 1.05], [1, 1.02]], inset: 0.05 },
  greenhouse: {
    u0: 0.024, u1: 0.7245, tumble: 0.8,
    top: [[0.024, 1.175], [0.04, 1.245], [0.07, 1.42], [0.0993, 1.524], [0.2418, 1.597], [0.4, 1.611], [0.558, 1.583], [0.586, 1.541], [0.655, 1.35], [0.7245, 1.159]],
  },
  roof: { u0: 0.09, u1: 0.57, black: true },
  pillars: [
    { bottom: [0.024, 0.07], top: [0.07, 0.11], black: true },
    { bottom: [0.19, 0.22], top: [0.22, 0.255], black: true },
    { bottom: [0.4277, 0.4435], top: [0.4277, 0.4435], black: true },
  ],
  cladding: { top: [[0, 0.6], [0.05, 0.52], [0.15, 0.43], [0.85, 0.43], [0.95, 0.5], [1, 0.58]], flare: 0.07 },
  doors: [[0.218, 0.25], [0.4435, 0.4435], [0.7, 0.69]],
  front: [
    { mat: 'gloss', mirror: true, poly: [[0.51, 0.941], [0.51, 0.965], [0.841, 1.035], [0.85, 0.894], [0.661, 0.894]] },
    { mat: 'drl', mirror: true, poly: [[0.53, 0.958], [0.83, 1.02], [0.83, 1.006], [0.53, 0.946]], layer: 1 },
    { mat: 'chrome', poly: [[-0.51, 0.955], [0.51, 0.955], [0.51, 0.967], [-0.51, 0.967]], layer: 1 },
    { mat: 'mesh', poly: [[-0.82, 0.762], [0.82, 0.762], [0.82, 0.678], [-0.82, 0.678]] },
    { mat: 'trim', poly: [[-0.62, 0.61], [0.62, 0.61], [0.66, 0.4], [-0.66, 0.4]] },
    { mat: 'gloss', mirror: true, poly: [[0.8, 0.762], [0.86, 0.762], [0.86, 0.585], [0.8, 0.585]] },
    { mat: 'head', mirror: true, poly: [[0.78, 0.74], [0.81, 0.74], [0.81, 0.705], [0.78, 0.705]], layer: 1 },
    { mat: 'silver', layer: 1, poly: [[-0.755, 0.35], [0.755, 0.35], [0.73, 0.27], [-0.73, 0.27]] },
  ],
  rear: [
    { mat: 'gloss', poly: [[-0.88, 1.105], [0.88, 1.105], [0.88, 1.155], [-0.88, 1.155]] },
    { mat: 'tail', poly: [[-0.86, 1.122], [0.86, 1.122], [0.86, 1.138], [-0.86, 1.138]], layer: 1 },
    { mat: 'silver', layer: 1, poly: [[-0.65, 0.3], [0.65, 0.3], [0.62, 0.38], [-0.62, 0.38]] },
    { mat: 'tail', mirror: true, poly: [[0.7, 0.46], [0.8, 0.46], [0.8, 0.44], [0.7, 0.44]], layer: 1 },
  ],
  side: [{ mat: 'silver', poly: [[0.26, 0.275], [0.68, 0.275], [0.68, 0.3], [0.26, 0.3]] }],
  plates: { front: 0.53, rear: 0.86 },
  rails: 'silver',
  spoiler: true,
  sunroof: [0.22, 0.5],
  mirrors: 'black',
  paint: '#2f6a86', // Eternal Blue
  plate: 'KA 05 SC 2026',
}

/** MPV — Maruti Suzuki Ertiga (2022), India's best-selling people carrier. 4395 × 1735 × 1690. */
export const ERTIGA: CarSpec = {
  id: 'maruti-ertiga',
  name: 'Maruti Suzuki Ertiga',
  L: 4.395, W: 1.735, H: 1.69,
  axles: [0.1952, 0.826],
  tyreR: 0.31, tyreW: 0.185, rim: 0.66, wheel: { style: 'multi', spokes: 15 },
  archGap: 0.05, archSquare: 0.1,
  sill: [[0, 0.31], [0.0058, 0.3], [0.057, 0.28], [0.15, 0.25], [0.3, 0.24], [0.75, 0.24], [0.931, 0.24], [0.99, 0.255], [1, 0.29]],
  top: [[0, 1.05], [0.01, 1.16], [0.019, 1.2], [0.05, 1.24], [0.0797, 1.3], [0.1176, 1.27], [0.1709, 1.18], [0.2696, 1.169], [0.4822, 1.118], [0.6948, 1.07], [0.7934, 1.12], [0.8238, 1.1], [0.9226, 1.0], [0.983, 0.94], [1, 0.73]],
  width: [[0, 0.8], [0.01, 0.87], [0.03, 0.93], [0.07, 0.975], [0.12, 0.995], [0.5, 1], [0.88, 0.995], [0.93, 0.975], [0.97, 0.93], [0.99, 0.87], [1, 0.8]],
  crown: 0.03,
  shoulder: { y: [[0, 1.12], [0.5, 1.0], [1, 0.95]], inset: 0.055 },
  greenhouse: {
    u0: 0.019, u1: 0.7934, tumble: 0.82,
    top: [[0.019, 1.2], [0.0266, 1.269], [0.05, 1.45], [0.0664, 1.57], [0.0759, 1.633], [0.1773, 1.661], [0.3302, 1.661], [0.4822, 1.636], [0.6036, 1.569], [0.6416, 1.503], [0.72, 1.32], [0.7934, 1.12]],
  },
  roof: { u0: 0.08, u1: 0.6, black: false },
  pillars: [
    { bottom: [0.03, 0.12], top: [0.04, 0.075], black: false },
    { bottom: [0.2468, 0.2734], top: [0.2468, 0.2734], black: true },
    { bottom: [0.4822, 0.5125], top: [0.4822, 0.5125], black: true },
  ],
  doors: [[0.2734, 0.2734], [0.5125, 0.5125], [0.78, 0.76]],
  front: [
    { mat: 'gloss', mirror: true, poly: [[0.4, 0.9], [0.62, 0.95], [0.82, 0.93], [0.85, 0.86], [0.62, 0.84], [0.42, 0.86]] },
    { mat: 'head', mirror: true, poly: [[0.62, 0.92], [0.72, 0.925], [0.72, 0.885], [0.62, 0.88]], layer: 1 },
    { mat: 'drl', mirror: true, poly: [[0.7, 0.935], [0.82, 0.925], [0.82, 0.918], [0.7, 0.927]], layer: 1 },
    { mat: 'hex', poly: [[-0.4, 0.9], [0.4, 0.9], [0.36, 0.76], [-0.36, 0.76]] },
    { mat: 'chrome', poly: [[-0.42, 0.905], [0.42, 0.905], [0.42, 0.888], [-0.42, 0.888]], layer: 1 },
    { mat: 'gloss', mirror: true, poly: [[0.56, 0.56], [0.8, 0.6], [0.82, 0.44], [0.6, 0.42]] },
    { mat: 'head', mirror: true, poly: [[0.66, 0.53], [0.72, 0.53], [0.72, 0.48], [0.66, 0.48]], layer: 1 },
    { mat: 'trim', poly: [[-0.5, 0.48], [0.5, 0.48], [0.46, 0.34], [-0.46, 0.34]] },
  ],
  rear: [
    // tall boomerang tail lamps climbing the D-pillars
    { mat: 'gloss', mirror: true, poly: [[0.53, 1.0], [0.84, 0.97], [0.86, 1.04], [0.53, 1.07]] },
    { mat: 'tail', mirror: true, poly: [[0.55, 1.015], [0.83, 0.99], [0.84, 1.03], [0.55, 1.055]], layer: 1 },
    { mat: 'trim', poly: [[-0.75, 0.45], [0.75, 0.45], [0.72, 0.33], [-0.72, 0.33]] },
    { mat: 'tail', mirror: true, poly: [[0.62, 0.5], [0.72, 0.5], [0.72, 0.48], [0.62, 0.48]], layer: 1 },
  ],
  side: [
    { mat: 'gloss', poly: [[0.02, 0.98], [0.11, 1.05], [0.11, 1.125], [0.045, 1.17], [0.035, 1.44], [0.02, 1.44]] },
    { mat: 'tail', poly: [[0.024, 1.0], [0.1, 1.06], [0.1, 1.11], [0.042, 1.15], [0.032, 1.41], [0.024, 1.41]], layer: 1 },
  ],
  plates: { front: 0.62, rear: 0.88 },
  spoiler: true,
  mirrors: 'body',
  paint: '#8a1420', // Auburn Red
  plate: 'MH 05 SC 2026',
}

export const SHOWCASE = [SIERRA_EV, ALTROZ, CITY, VICTORIS, ERTIGA] as const

/** The closest reference shape for any body style (used without its lamp/grille signature on other cars' pages). */
export function archetype(body: string, fuel?: string): CarSpec {
  if (body === 'hatchback') return ALTROZ
  if (body === 'sedan' || body === 'coupe') return CITY
  if (body === 'mpv') return ERTIGA
  if (fuel === 'ev' && body === 'suv') return SIERRA_EV
  return VICTORIS
}

export const SPEC_BY_ID: Record<string, CarSpec> = Object.fromEntries(SHOWCASE.map((s) => [s.id, s]))
