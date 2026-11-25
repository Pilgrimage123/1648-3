/**
 * Procedural Baroque PBR Materials, Texture Suite & Chiaroscuro Lighting Profiles
 * (`/src/components/canvas/baroqueMaterials.ts`).
 *
 * Strictly obeys ADR-0007 (Baroque Art Direction Constitution):
 * - Pillar 1: Walkable floor micro-relief is strictly low-contrast so the tactical grid
 *   and movement zones (Blue 1 AP / Gold 2 AP) stay 100% legible.
 * - Pillar 2: 60-30-10 discipline — tactile bump/roughness detail lives on 30% architecture
 *   (ashlar masonry, fluted columns, carved walnut) and 10% gilded/heraldic highlights.
 * - Zero external files / zero 404s: 100% procedural CanvasTexture + GLSL shaders.
 */

import * as THREE from "three";
import type { ScenarioId, WeatherType } from "../../core/types";

export interface VolumetricShaftSpec {
  id: string;
  gridX: number;
  gridY: 0 | 1 | 2;
  gridZ: number;
  heightOffset: number;
  topRadius: number;
  bottomRadius: number;
  height: number;
  rotX: number;
  rotZ: number;
  color: string;
  baseOpacity: number;
  pulseSpeed: number;
  pulseAmp: number;
}

export interface BaroqueLightingProfile {
  exposure: number;
  envIntensity: number;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  rimPosition: [number, number, number];
  ambientColor: string;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  groundPlaneColor: string;
  shafts: VolumetricShaftSpec[];
}

export interface BaroqueWaterProfile {
  baseHex: string;
  waveHex: string;
  specularHex: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  bumpScale: number;
  scrollSpeedX: number;
  scrollSpeedZ: number;
  glintStrength: number;
  glintPower: number;
}

export interface BaroqueFrameStyle {
  vignetteGradient: string;
  cornerOpacity: number;
  accentHex: string;
}

/**
 * Calibrated Baroque Chiaroscuro lighting profile per mission & weather.
 * Balances warm/cool Caravaggio contrast while preserving crisp unit & grid legibility.
 */
export function getBaroqueLightingProfile(
  scenario: ScenarioId,
  weather: WeatherType,
): BaroqueLightingProfile {
  const isFog = weather === "fog";
  const isRain = weather === "rain";

  if (scenario === "mission2") {
    // Mission 2: Old Town Bridge Tower at misty Vltava dawn (golden eastern sun vs. cool slate river mist)
    const shaftScale = isFog ? 0.35 : isRain ? 0.55 : 1.0;
    return {
      exposure: isFog ? 0.94 : 1.0,
      envIntensity: isFog ? 0.24 : 0.34,
      keyColor: isFog ? "#d9e3ec" : "#ffecd0",
      keyIntensity: isFog ? 1.42 : isRain ? 1.82 : 2.22,
      rimColor: "#8eb4d9",
      rimIntensity: isFog ? 0.34 : 0.54,
      rimPosition: [-22, 16, 18],
      ambientColor: "#8ea6bd",
      ambientIntensity: isFog ? 0.38 : 0.44,
      hemiSkyColor: "#cfe2f2",
      hemiGroundColor: "#4a3a2c",
      hemiIntensity: 0.62,
      fogColor: isFog ? "#5d6773" : isRain ? "#515b67" : "#6c747e",
      fogNear: 36,
      fogFar: isFog ? 78 : 124,
      groundPlaneColor: "#2d2a26",
      shafts: [
        {
          id: "m2-east-arch-sunbeam",
          gridX: 19.5,
          gridY: 0,
          gridZ: 14,
          heightOffset: 7.4,
          topRadius: 1.4,
          bottomRadius: 4.8,
          height: 15,
          rotX: 0.08,
          rotZ: 0.36,
          color: "#ffe4b5",
          baseOpacity: 0.11 * shaftScale,
          pulseSpeed: 0.9,
          pulseAmp: 0.014 * shaftScale,
        },
        {
          id: "m2-bridge-deck-sunbeam",
          gridX: 6.5,
          gridY: 0,
          gridZ: 14,
          heightOffset: 7.6,
          topRadius: 1.6,
          bottomRadius: 5.2,
          height: 15.5,
          rotX: 0.06,
          rotZ: 0.38,
          color: "#ffdfaa",
          baseOpacity: 0.085 * shaftScale,
          pulseSpeed: 0.75,
          pulseAmp: 0.011 * shaftScale,
        },
      ],
    };
  }

  if (scenario === "mission3") {
    // Mission 3: Powder Yard nocturnal sortie — cool moonlit courtyard vs. warm copper hearth/matchcord accents
    const shaftScale = isFog ? 0.25 : isRain ? 0.5 : 1.0;
    return {
      exposure: isFog ? 0.92 : 0.98,
      envIntensity: isFog ? 0.18 : 0.24,
      keyColor: "#b8cee6",
      keyIntensity: isFog ? 1.1 : isRain ? 1.4 : 1.7,
      rimColor: "#f59e0b",
      rimIntensity: isFog ? 0.36 : 0.56,
      rimPosition: [26, 12, 6],
      ambientColor: "#6d839b",
      ambientIntensity: isFog ? 0.3 : 0.36,
      hemiSkyColor: "#9eb8d4",
      hemiGroundColor: "#332419",
      hemiIntensity: 0.48,
      fogColor: isFog ? "#1a2332" : "#0e1421",
      fogNear: 36,
      fogFar: isFog ? 74 : 114,
      groundPlaneColor: "#11151d",
      shafts: [
        {
          id: "m3-yard-moonbeam",
          gridX: 11.5,
          gridY: 0,
          gridZ: 10.5,
          heightOffset: 7.4,
          topRadius: 1.2,
          bottomRadius: 4.5,
          height: 14,
          rotX: 0.1,
          rotZ: -0.16,
          color: "#dbeafe",
          baseOpacity: 0.075 * shaftScale,
          pulseSpeed: 1.0,
          pulseAmp: 0.01 * shaftScale,
        },
        {
          id: "m3-battery-ember-haze",
          gridX: 17.2,
          gridY: 0,
          gridZ: 9.5,
          heightOffset: 5.6,
          topRadius: 1.5,
          bottomRadius: 3.8,
          height: 11,
          rotX: -0.06,
          rotZ: 0.2,
          color: "#fdba74",
          baseOpacity: 0.065 * shaftScale,
          pulseSpeed: 1.6,
          pulseAmp: 0.014 * shaftScale,
        },
      ],
    };
  }

  // Mission 1: Grand Priory Palace nocturnal raid — silver-blue moonlit garden vs. warm gilded Baroque interiors
  const shaftScale = isFog ? 0.22 : isRain ? 0.45 : 1.0;
  return {
    exposure: isFog ? 0.92 : 0.98,
    envIntensity: isFog ? 0.19 : 0.26,
    keyColor: "#b8cee6",
    keyIntensity: isFog ? 1.08 : isRain ? 1.4 : 1.72,
    rimColor: "#fbbf24",
    rimIntensity: isFog ? 0.34 : 0.52,
    rimPosition: [-18, 15, 22],
    ambientColor: "#6f859c",
    ambientIntensity: isFog ? 0.3 : 0.36,
    hemiSkyColor: "#a4bed6",
    hemiGroundColor: "#36261a",
    hemiIntensity: 0.5,
    fogColor: isFog ? "#1a2332" : "#0c1220",
    fogNear: 38,
    fogFar: isFog ? 74 : 118,
    groundPlaneColor: "#111620",
    shafts: [
      {
        id: "m1-courtyard-shaft",
        gridX: 11.5,
        gridY: 0,
        gridZ: 19,
        heightOffset: 7.4,
        topRadius: 1.0,
        bottomRadius: 3.6,
        height: 13.5,
        rotX: 0.08,
        rotZ: -0.14,
        color: "#fde68a",
        baseOpacity: 0.1 * shaftScale,
        pulseSpeed: 1.25,
        pulseAmp: 0.012 * shaftScale,
      },
      {
        id: "m1-garden-moonbeam",
        gridX: 11,
        gridY: 0,
        gridZ: 8,
        heightOffset: 7.8,
        topRadius: 1.25,
        bottomRadius: 4.5,
        height: 14.5,
        rotX: 0.12,
        rotZ: -0.18,
        color: "#dbeafe",
        baseOpacity: 0.082 * shaftScale,
        pulseSpeed: 0.95,
        pulseAmp: 0.01 * shaftScale,
      },
    ],
  };
}

/**
 * Calibrated water rendering parameters for Čertovka (M1) and Vltava (M2).
 */
export function getBaroqueWaterProfile(
  scenario: ScenarioId,
  weather: WeatherType,
): BaroqueWaterProfile {
  const isMission2 = scenario === "mission2";
  const rainMul = weather === "rain" ? 1.35 : 1.0;

  if (isMission2) {
    return {
      baseHex: "#174b63",
      waveHex: "#1f5c78",
      specularHex: "#ffe6b8",
      roughness: weather === "rain" ? 0.2 : 0.14,
      metalness: 0.38,
      envMapIntensity: weather === "fog" ? 0.92 : 1.28,
      bumpScale: 0.024 * rainMul,
      scrollSpeedX: 0.014 * rainMul,
      scrollSpeedZ: -0.065 * rainMul,
      glintStrength: weather === "clear" ? 1.15 : weather === "rain" ? 0.42 : 0.1,
      glintPower: 20,
    };
  }

  // Mission 1 & 3 Čertovka nocturnal millrace — rich deep river teal-cyan contrasting against warm earthy cobbles
  return {
    baseHex: "#103a4f",
    waveHex: "#174a63",
    specularHex: "#9ec0e0",
    roughness: weather === "rain" ? 0.22 : 0.16,
    metalness: 0.34,
    envMapIntensity: weather === "fog" ? 0.78 : 1.08,
    bumpScale: 0.02 * rainMul,
    scrollSpeedX: -0.04 * rainMul,
    scrollSpeedZ: 0.01 * rainMul,
    glintStrength: weather === "clear" ? 0.62 : weather === "rain" ? 0.26 : 0.08,
    glintPower: 24,
  };
}

/**
 * Calibrated Baroque edge chiaroscuro vignette & corner gold opacity.
 * Keeps central 85% viewport 100% clear of tinting or obstruction.
 */
export function getBaroqueChiaroscuroFrameStyle(
  scenario: ScenarioId,
): BaroqueFrameStyle {
  if (scenario === "mission2") {
    return {
      vignetteGradient:
        "radial-gradient(ellipse 90% 84% at 50% 48%, rgba(8,10,14,0) 72%, rgba(12,11,9,0.14) 89%, rgba(5,6,9,0.36) 100%)",
      cornerOpacity: 0.52,
      accentHex: "#d4a73f",
    };
  }
  if (scenario === "mission3") {
    return {
      vignetteGradient:
        "radial-gradient(ellipse 88% 82% at 50% 48%, rgba(7,9,14,0) 70%, rgba(12,9,7,0.22) 87%, rgba(4,5,8,0.46) 100%)",
      cornerOpacity: 0.58,
      accentHex: "#d99b38",
    };
  }
  return {
    vignetteGradient:
      "radial-gradient(ellipse 88% 82% at 50% 48%, rgba(7,11,18,0) 70%, rgba(10,9,12,0.22) 87%, rgba(3,5,9,0.46) 100%)",
    cornerOpacity: 0.62,
    accentHex: "#d4a73f",
  };
}

/** Soft-edge Fresnel + vertical fade volumetric God-ray shader (no harsh cylinder edges). */
export const BAROQUE_VOLUMETRIC_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const BAROQUE_VOLUMETRIC_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(vViewPos);
    float edgeFade = pow(abs(dot(normalize(vNormalView), viewDir)), 1.65);
    float bottomFade = smoothstep(0.0, 0.28, vUv.y);
    float topFade = smoothstep(1.0, 0.62, vUv.y);
    float alpha = uOpacity * edgeFade * bottomFade * topFade;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Deterministic PRNG & Procedural Canvas PBR Texture Suite
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  {
    isColor,
    repeatX = 1,
    repeatY = 1,
    anisotropy = 4,
  }: { isColor: boolean; repeatX?: number; repeatY?: number; anisotropy?: number },
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** 1. Calm low-contrast limestone/cobble micro-relief bump (ADR-0007 Pillar 1: ground stays calm). */
function createFloorMicroReliefBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164801);

  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle tile border bevel (outer perimeter only, center remains calm)
  ctx.strokeStyle = "rgb(108,108,108)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  // Ultra-subtle mineral stipple
  for (let i = 0; i < 650; i++) {
    const v = Math.floor(118 + rand() * 20);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 4);
  }

  return finalizeTexture(canvas, { isColor: false, anisotropy });
}

/** 2. Baroque sandstone ashlar masonry bump map for walls & bridge tower. */
function createMasonryAshlarBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164802);

  ctx.fillStyle = "rgb(72,72,72)";
  ctx.fillRect(0, 0, 256, 256);

  const rows = 6;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 3;
    const colW = 256 / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * colW + offset;
      const by = r * rowH;
      const tone = Math.floor(148 + rand() * 42);
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
      ctx.fillRect(bx + 3, by + 3, colW - 6, rowH - 6);

      // Chiseled top highlight & bottom bevel
      ctx.fillStyle = `rgb(${Math.min(235, tone + 28)},${Math.min(235, tone + 28)},${Math.min(235, tone + 28)})`;
      ctx.fillRect(bx + 3, by + 3, colW - 6, 2.5);
      ctx.fillStyle = `rgb(${Math.max(70, tone - 34)},${Math.max(70, tone - 34)},${Math.max(70, tone - 34)})`;
      ctx.fillRect(bx + 3, by + rowH - 5.5, colW - 6, 2.5);
    }
  }

  // Subtle sandstone pitting
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(95 + rand() * 95);
    ctx.fillStyle = `rgba(${v},${v},${v},0.28)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 3, 1.5 + rand() * 2.5);
  }

  return finalizeTexture(canvas, { isColor: false, anisotropy });
}

/** 3. Classical/Baroque vertical fluted column shaft bump map. */
function createFlutedColumnBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164803);

  const flutes = 16;
  const fluteW = 256 / flutes;
  for (let f = 0; f < flutes; f++) {
    const x0 = f * fluteW;
    const grad = ctx.createLinearGradient(x0, 0, x0 + fluteW, 0);
    grad.addColorStop(0.0, "rgb(218,218,218)");
    grad.addColorStop(0.18, "rgb(140,140,140)");
    grad.addColorStop(0.5, "rgb(78,78,78)");
    grad.addColorStop(0.82, "rgb(140,140,140)");
    grad.addColorStop(1.0, "rgb(218,218,218)");
    ctx.fillStyle = grad;
    ctx.fillRect(x0, 0, fluteW + 0.5, 256);
  }

  // Horizontal astragal collar bands near top & bottom
  ctx.fillStyle = "rgb(232,232,232)";
  ctx.fillRect(0, 14, 256, 9);
  ctx.fillRect(0, 232, 256, 10);
  ctx.fillStyle = "rgb(82,82,82)";
  ctx.fillRect(0, 23, 256, 4);
  ctx.fillRect(0, 228, 256, 4);

  // Fine marble veining grain
  for (let i = 0; i < 400; i++) {
    const v = Math.floor(110 + rand() * 45);
    ctx.fillStyle = `rgba(${v},${v},${v},0.16)`;
    ctx.fillRect(rand() * 256, rand() * 256, 1.5, 6 + rand() * 14);
  }

  return finalizeTexture(canvas, { isColor: false, anisotropy });
}

/** 4. Carved walnut & Baroque oak timber grain bump map. */
function createCarvedWalnutBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164804);

  ctx.fillStyle = "rgb(132,132,132)";
  ctx.fillRect(0, 0, 256, 256);

  // Longitudinal wood grain fibers
  for (let i = 0; i < 160; i++) {
    const x = rand() * 256;
    const v = Math.floor(96 + rand() * 72);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.lineWidth = 1 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + (rand() - 0.5) * 10,
      85,
      x + (rand() - 0.5) * 10,
      170,
      x + (rand() - 0.5) * 6,
      256,
    );
    ctx.stroke();
  }

  // Carved Baroque inset panel molding
  ctx.strokeStyle = "rgb(64,64,64)";
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, 216, 216);
  ctx.strokeStyle = "rgb(206,206,206)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(26, 26, 204, 204);

  return finalizeTexture(canvas, { isColor: false, anisotropy });
}

/** 5. Chased Baroque gilded acanthus scrollwork relief bump map. */
function createGildedFiligreeBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  ctx.fillStyle = "rgb(112,112,112)";
  ctx.fillRect(0, 0, 256, 256);

  // Beaded classical egg-and-dart / pearl border
  ctx.fillStyle = "rgb(225,225,225)";
  for (let i = 8; i < 256; i += 16) {
    ctx.beginPath();
    ctx.arc(i, 14, 4.5, 0, Math.PI * 2);
    ctx.arc(i, 242, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scrolling Baroque C-scroll & acanthus tendrils
  ctx.strokeStyle = "rgb(232,232,232)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let row = 0; row < 2; row++) {
    const cy = 76 + row * 104;
    for (let col = 0; col < 2; col++) {
      const cx = 64 + col * 128;
      ctx.beginPath();
      ctx.arc(cx - 22, cy, 24, 0.25 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 22, cy, 24, 1.25 * Math.PI, 2.85 * Math.PI);
      ctx.stroke();

      // Central rosette boss
      ctx.fillStyle = "rgb(245,245,245)";
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalizeTexture(canvas, { isColor: false, anisotropy });
}

/** 6. Seamless low-frequency organic water ripple height map for Čertovka & Vltava. */
function createWaterRippleBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const img = ctx.createImageData(256, 256);
  const d = img.data;

  for (let y = 0; y < 256; y++) {
    const ny = (y / 256) * Math.PI * 2;
    for (let x = 0; x < 256; x++) {
      const nx = (x / 256) * Math.PI * 2;
      // Gentle multi-harmonic river swells without crisp diagonal diamond stripes
      const w1 = Math.sin(nx * 2 + Math.sin(ny * 2) * 0.65);
      const w2 = Math.cos(ny * 3 + Math.cos(nx * 2) * 0.55) * 0.7;
      const w3 = Math.sin(nx * 3 - ny * 2 + 0.9) * 0.35;
      const h = Math.max(0, Math.min(255, Math.floor(128 + (w1 + w2 + w3) * 24)));
      const idx = (y * 256 + x) * 4;
      d[idx] = h;
      d[idx + 1] = h;
      d[idx + 2] = h;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  return finalizeTexture(canvas, { isColor: false, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6b. Neutral-white multiplicative Baroque ashlar masonry detail texture (sRGB). */
function createMasonryStoneAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164806);

  // Subtle recessed mortar joints (multiplies cleanly with wall/instance colors)
  ctx.fillStyle = "rgb(198,194,188)";
  ctx.fillRect(0, 0, 256, 256);

  const rows = 5;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 3;
    const colW = 256 / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * colW + offset;
      const by = r * rowH;
      const base = Math.floor(234 + rand() * 20);
      const warm = Math.min(255, base + 2);
      const cool = Math.max(210, base - 3);
      ctx.fillStyle = `rgb(${warm},${base},${cool})`;
      ctx.fillRect(bx + 2.5, by + 2.5, colW - 5, rowH - 5);

      // Subtle upper chiseled edge & lower shadow lip
      ctx.fillStyle = "rgba(255,253,248,0.45)";
      ctx.fillRect(bx + 2.5, by + 2.5, colW - 5, 2.5);
      ctx.fillStyle = "rgba(150,142,132,0.28)";
      ctx.fillRect(bx + 2.5, by + rowH - 5, colW - 5, 2.5);
    }
  }

  // Gentle plaster / sandstone patina speckles
  for (let i = 0; i < 600; i++) {
    const v = Math.floor(215 + rand() * 38);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 5},0.22)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 3);
  }

  return finalizeTexture(canvas, { isColor: true, anisotropy });
}

/** 6c. Ultra-calm multiplicative stone-tile/parquet detail texture (ADR-0007 Pillar 1: ground stays calm). */
function createFloorParquetAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164807);

  ctx.fillStyle = "rgb(252,251,249)";
  ctx.fillRect(0, 0, 256, 256);

  // Delicate outer perimeter stone joint framing each tile without cluttering center
  ctx.strokeStyle = "rgb(230,227,222)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 250);

  // Ultra-soft mineral variation in high-luminance range (240..255)
  for (let i = 0; i < 380; i++) {
    const v = Math.floor(240 + rand() * 14);
    ctx.fillStyle = `rgba(${v},${v - 1},${v - 2},0.35)`;
    ctx.fillRect(rand() * 256, rand() * 256, 3 + rand() * 6, 3 + rand() * 6);
  }

  return finalizeTexture(canvas, { isColor: true, anisotropy });
}

/** 6d. Bohemian clay roof tile (prejzy / bobrovky) scalloped bump map for Prague 1648 roofs. */
function createRoofTileBump(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164808);

  ctx.fillStyle = "rgb(82,82,82)";
  ctx.fillRect(0, 0, 256, 256);

  const rows = 10;
  const cols = 12;
  const rowH = 256 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    const y0 = r * rowH;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * colW + offset;
      const base = Math.floor(156 + rand() * 36);
      const grad = ctx.createLinearGradient(x0, y0, x0, y0 + rowH);
      grad.addColorStop(0, `rgb(${Math.max(70, base - 38)},${Math.max(70, base - 38)},${Math.max(70, base - 38)})`);
      grad.addColorStop(0.55, `rgb(${base},${base},${base})`);
      grad.addColorStop(1, `rgb(${Math.min(240, base + 26)},${Math.min(240, base + 26)},${Math.min(240, base + 26)})`);
      ctx.fillStyle = grad;

      // Beaver-tail (bobrovka) rounded bottom tab
      ctx.beginPath();
      ctx.moveTo(x0 + 1, y0);
      ctx.lineTo(x0 + colW - 1, y0);
      ctx.lineTo(x0 + colW - 1, y0 + rowH * 0.62);
      ctx.arc(x0 + colW * 0.5, y0 + rowH * 0.62, colW * 0.45, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Subtle side seam shadow
      ctx.strokeStyle = "rgba(48,48,48,0.6)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  return finalizeTexture(canvas, { isColor: false, repeatX: 2, repeatY: 2, anisotropy });
}

/** 6e. Multiplicative weathered clay roof-tile tonal variation texture (sRGB). */
function createRoofTileAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164809);

  ctx.fillStyle = "rgb(208,204,200)";
  ctx.fillRect(0, 0, 256, 256);

  const rows = 10;
  const cols = 12;
  const rowH = 256 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    const y0 = r * rowH;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * colW + offset;
      const v = Math.floor(214 + rand() * 38);
      const warm = Math.min(255, v + Math.floor(rand() * 10));
      const cool = Math.max(185, v - Math.floor(rand() * 14));
      ctx.fillStyle = `rgb(${warm},${v},${cool})`;
      ctx.fillRect(x0 + 1, y0 + 1, colW - 2, rowH - 2);

      // Overlap shadow along bottom lip of each shingle course
      ctx.fillStyle = "rgba(70,58,52,0.22)";
      ctx.fillRect(x0, y0 + rowH - 3, colW, 3);
    }
  }

  // Subtle moss / soot weathering streaks
  for (let i = 0; i < 240; i++) {
    const dark = Math.floor(175 + rand() * 55);
    ctx.fillStyle = `rgba(${dark},${dark},${dark - 4},0.16)`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 5, 4 + rand() * 10);
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 2, repeatY: 2, anisotropy });
}

/** 6f. High-contrast 512×512 Bohemian Renaissance two-layer sgraffito (černá uhlová + bílá vápenná omítka, psaníčková bosáž + vlys). */
function createSgraffitoFacadeAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(512, 512);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164810);

  // Crisp top white limewash base (charcoal underlayer scratched through beneath)
  ctx.fillStyle = "rgb(244,239,230)";
  ctx.fillRect(0, 0, 512, 512);

  // Refined upper Renaissance scrollwork & medallion sgraffito frieze under eaves
  const friezeH = 52;
  ctx.fillStyle = "rgb(66,62,58)";
  ctx.fillRect(0, 0, 512, friezeH);
  ctx.fillStyle = "rgb(238,232,220)";
  ctx.fillRect(0, 4, 512, 4);
  ctx.fillRect(0, friezeH - 8, 512, 4);
  ctx.strokeStyle = "rgb(238,232,220)";
  ctx.lineWidth = 3.2;
  for (let x = 32; x < 512; x += 64) {
    ctx.beginPath();
    ctx.arc(x, friezeH * 0.5, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(238,232,220)";
    ctx.beginPath();
    ctx.arc(x, friezeH * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 32, friezeH * 0.5);
    ctx.quadraticCurveTo(x - 16, 10, x, friezeH * 0.5);
    ctx.quadraticCurveTo(x + 16, friezeH - 10, x + 32, friezeH * 0.5);
    ctx.stroke();
  }

  // Fine high-contrast envelope-rusticated sgraffito (psaníčková bosáž, 6×10 courses)
  const startY = friezeH;
  const rows = 10;
  const cols = 6;
  const rowH = (512 - startY) / rows;
  const colW = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    const y0 = startY + r * rowH;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * colW + offset;
      const cx = x0 + colW * 0.5;
      const cy = y0 + rowH * 0.5;
      const pad = 2.6;

      // Exposed dark charcoal-mortar joint background
      ctx.fillStyle = "rgb(68,64,60)";
      ctx.fillRect(x0, y0, colW, rowH);

      // Top bright lime bevel
      ctx.fillStyle = "rgb(250,246,238)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + pad);
      ctx.lineTo(x0 + colW - pad, y0 + pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      // Left sunlit-mid bevel
      ctx.fillStyle = "rgb(220,214,204)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + pad);
      ctx.lineTo(cx, cy);
      ctx.lineTo(x0 + pad, y0 + rowH - pad);
      ctx.closePath();
      ctx.fill();

      // Right shaded charcoal-scratched bevel
      ctx.fillStyle = "rgb(138,131,122)";
      ctx.beginPath();
      ctx.moveTo(x0 + colW - pad, y0 + pad);
      ctx.lineTo(x0 + colW - pad, y0 + rowH - pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      // Bottom deep charcoal-scratched shadow bevel
      ctx.fillStyle = "rgb(88,82,76)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + rowH - pad);
      ctx.lineTo(x0 + colW - pad, y0 + rowH - pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      // Crisp inner scratched white psaníčko envelope rectangle
      ctx.fillStyle = "rgb(246,241,232)";
      ctx.fillRect(x0 + colW * 0.27, y0 + rowH * 0.33, colW * 0.46, rowH * 0.34);
      ctx.strokeStyle = "rgb(74,69,63)";
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x0 + colW * 0.27, y0 + rowH * 0.33, colW * 0.46, rowH * 0.34);
    }
  }

  // Subtle hand-troweled limewash patina
  for (let i = 0; i < 650; i++) {
    const v = Math.floor(205 + rand() * 44);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 5},0.12)`;
    ctx.fillRect(rand() * 512, rand() * 512, 3 + rand() * 6, 2 + rand() * 5);
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6f-1b. Seamless tileable psaníčkové sgrafito (no top dark band) for Renaissance gables & lunette attics. */
function createSgraffitoPatternAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  const rows = 6;
  const cols = 4;
  const rowH = 256 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    const y0 = r * rowH;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * colW + offset;
      const cx = x0 + colW * 0.5;
      const cy = y0 + rowH * 0.5;
      const pad = 2.0;

      ctx.fillStyle = "rgb(74,70,65)";
      ctx.fillRect(x0, y0, colW, rowH);

      ctx.fillStyle = "rgb(248,244,236)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + pad);
      ctx.lineTo(x0 + colW - pad, y0 + pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(218,212,202)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + pad);
      ctx.lineTo(cx, cy);
      ctx.lineTo(x0 + pad, y0 + rowH - pad);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(142,135,126)";
      ctx.beginPath();
      ctx.moveTo(x0 + colW - pad, y0 + pad);
      ctx.lineTo(x0 + colW - pad, y0 + rowH - pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(96,90,84)";
      ctx.beginPath();
      ctx.moveTo(x0 + pad, y0 + rowH - pad);
      ctx.lineTo(x0 + colW - pad, y0 + rowH - pad);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgb(244,239,230)";
      ctx.fillRect(x0 + colW * 0.27, y0 + rowH * 0.33, colW * 0.46, rowH * 0.34);
      ctx.strokeStyle = "rgb(82,76,70)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x0 + colW * 0.27, y0 + rowH * 0.33, colW * 0.46, rowH * 0.34);
    }
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6f-2. Rich 512×512 Renaissance frescoed plaster with painted grotesque friezes, garlands & illusionistic borders (sRGB). */
function createRenaissanceFrescoAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(512, 512);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164812);

  // Neutral-bright lime base so rich mineral pigments (Venetian red, ochre, sage, slate-blue) multiply vibrantly
  ctx.fillStyle = "rgb(242,236,226)";
  ctx.fillRect(0, 0, 512, 512);

  // Painted fresco grotesque & garland bands (under eaves + piano nobile belt)
  const drawGrotesqueBand = (y0: number, h: number) => {
    ctx.fillStyle = "rgba(92,74,58,0.46)";
    ctx.fillRect(0, y0, 512, h);
    ctx.fillStyle = "rgba(255,250,240,0.8)";
    ctx.fillRect(0, y0 + 3, 512, 4);
    ctx.fillRect(0, y0 + h - 7, 512, 4);

    // Repeating Renaissance foliate medallions & festoon garlands
    ctx.strokeStyle = "rgba(255,248,234,0.82)";
    ctx.lineWidth = 2.8;
    for (let x = 44; x < 512; x += 88) {
      ctx.beginPath();
      ctx.ellipse(x, y0 + h * 0.5, 22, h * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,246,226,0.55)";
      ctx.beginPath();
      ctx.arc(x, y0 + h * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();
      // Connecting botanical swags
      ctx.beginPath();
      ctx.moveTo(x - 44, y0 + h * 0.34);
      ctx.quadraticCurveTo(x - 28, y0 + h * 0.78, x - 22, y0 + h * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 22, y0 + h * 0.5);
      ctx.quadraticCurveTo(x + 28, y0 + h * 0.78, x + 44, y0 + h * 0.34);
      ctx.stroke();
    }
  };
  drawGrotesqueBand(14, 52);
  drawGrotesqueBand(252, 34);

  // Painted illusionistic corner pilasters (iluzivní architektura)
  ctx.fillStyle = "rgba(255,251,242,0.48)";
  ctx.fillRect(0, 0, 26, 512);
  ctx.fillRect(486, 0, 26, 512);
  ctx.strokeStyle = "rgba(88,74,62,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 18, 504);
  ctx.strokeRect(490, 4, 18, 504);

  // Warm fresco limewash brush patina
  for (let i = 0; i < 820; i++) {
    const v = Math.floor(212 + rand() * 38);
    ctx.fillStyle = `rgba(${v},${v - 4},${v - 8},0.18)`;
    ctx.fillRect(rand() * 512, rand() * 512, 5 + rand() * 12, 4 + rand() * 9);
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6f-3. Gothic smooth limewash plaster with alternating illusionistic painted corner quoins (malované nárožní kvádrování). */
function createGothicPlasterAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164813);

  // Smooth natural medieval limewash field
  ctx.fillStyle = "rgb(238,234,226)";
  ctx.fillRect(0, 0, 256, 256);

  // Soft hand-troweled medieval limewash texture
  for (let i = 0; i < 480; i++) {
    const v = Math.floor(214 + rand() * 36);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 4},0.22)`;
    ctx.fillRect(rand() * 256, rand() * 256, 4 + rand() * 9, 4 + rand() * 9);
  }

  // Painted alternating corner quoins (iluzivní malované nárožní kvádrování) on both outer margins
  const courses = 12;
  const ch = 256 / courses;
  for (let r = 0; r < courses; r++) {
    const y0 = r * ch;
    const wide = r % 2 === 0;
    const qw = wide ? 24 : 14;
    const shade = wide ? "rgb(154,148,138)" : "rgb(186,180,170)";

    // Left edge quoin
    ctx.fillStyle = shade;
    ctx.fillRect(0, y0 + 1.5, qw, ch - 3);
    ctx.strokeStyle = "rgb(104,98,90)";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(0, y0 + 1.5, qw, ch - 3);

    // Right edge quoin
    ctx.fillStyle = shade;
    ctx.fillRect(256 - qw, y0 + 1.5, qw, ch - 3);
    ctx.strokeRect(256 - qw, y0 + 1.5, qw, ch - 3);
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6f-4. Smooth hand-troweled Early Baroque stucco plaster (no ashlar block grid — crisp contrast for pilasters & cornices). */
function createBaroqueStuccoAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164814);

  // Bright warm lime-stucco field (multiplies cleanly with ochre, terracotta & salmon instance colors)
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgb(246,242,235)");
  grad.addColorStop(0.65, "rgb(238,234,226)");
  grad.addColorStop(1, "rgb(220,214,205)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle Italianate hand-troweled stucco plaster patina (no brick/stone seams)
  for (let i = 0; i < 620; i++) {
    const v = Math.floor(218 + rand() * 36);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 5},0.18)`;
    ctx.fillRect(rand() * 256, rand() * 256, 5 + rand() * 14, 4 + rand() * 10);
  }

  // Subtle shadow lip just under cornice line for plastic relief
  ctx.fillStyle = "rgba(110,98,86,0.18)";
  ctx.fillRect(0, 0, 256, 7);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6f-5. Clean smooth medieval limewash plaster (without corner quoins) for Gothic crow-stepped gables. */
function createSmoothLimeAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 256);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164815);

  ctx.fillStyle = "rgb(236,232,224)";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 520; i++) {
    const v = Math.floor(210 + rand() * 38);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 4},0.22)`;
    ctx.fillRect(rand() * 256, rand() * 256, 4 + rand() * 10, 4 + rand() * 10);
  }

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6g. Gothic leaded bullseye rondel glass (olověné zasklení z kulatých terčíků — bukle, sRGB). */
function createGothicWindowAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 128);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Deep lead-came matrix background
  ctx.fillStyle = "rgb(112,108,102)";
  ctx.fillRect(0, 0, 128, 128);

  // Circular bullseye rondels (bukle) in 4×5 leaded rows
  const cols = 4;
  const rows = 5;
  const cw = 104 / cols;
  const rh = 104 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = 12 + c * cw + cw * 0.5;
      const cy = 12 + r * rh + rh * 0.5;
      const rad = Math.min(cw, rh) * 0.44;
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
      grad.addColorStop(0, "rgb(255,252,242)");
      grad.addColorStop(0.55, "rgb(218,220,214)");
      grad.addColorStop(1, "rgb(140,142,138)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgb(62,58,54)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Heavy outer dark timber/stone rebate border
  ctx.fillStyle = "rgb(56,52,48)";
  ctx.fillRect(0, 0, 128, 11);
  ctx.fillRect(0, 117, 128, 11);
  ctx.fillRect(0, 0, 11, 128);
  ctx.fillRect(117, 0, 11, 128);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6g-2. Renaissance leaded square panes with central stained-glass heraldic medallion & cross transom (sRGB). */
function createWindowPaneAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 128);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Bright clear glass base (multiplies with dark reflective slate or warm candle amber)
  ctx.fillStyle = "rgb(245,244,238)";
  ctx.fillRect(0, 0, 128, 128);

  // Larger Renaissance leaded square panes
  ctx.strokeStyle = "rgba(76,72,68,0.52)";
  ctx.lineWidth = 2.2;
  for (let x = 26; x < 128; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 26; y < 128; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  // Painted heraldic roundel medallions in the lower panes
  for (const mx of [35, 93]) {
    ctx.fillStyle = "rgba(214,174,108,0.55)";
    ctx.beginPath();
    ctx.arc(mx, 82, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(88,68,46,0.7)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Heavy outer timber casement frame & iconic Renaissance cross transom (křížové okno)
  ctx.fillStyle = "rgb(68,62,56)";
  ctx.fillRect(0, 0, 128, 9);
  ctx.fillRect(0, 119, 128, 9);
  ctx.fillRect(0, 0, 9, 128);
  ctx.fillRect(119, 0, 9, 128);
  ctx.fillRect(60, 0, 8, 128);
  ctx.fillRect(0, 44, 128, 8);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6g-3. Early Baroque tall wooden-mullioned casement window with larger rectangular crown-glass panes (sRGB). */
function createBaroqueWindowAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 128);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Bright slightly wavy greenish-blue tinted crown glass base
  const glass = ctx.createLinearGradient(0, 0, 128, 128);
  glass.addColorStop(0, "rgb(232,248,244)");
  glass.addColorStop(0.5, "rgb(246,252,250)");
  glass.addColorStop(1, "rgb(218,236,238)");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle wavy crown-glass sheen streaks
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(18, 14, 14, 100);
  ctx.fillRect(82, 14, 10, 100);

  // Crisp light-painted Baroque wooden casement frame (6 large rectangular panes)
  ctx.fillStyle = "rgb(192,184,172)";
  ctx.fillRect(0, 0, 128, 8);
  ctx.fillRect(0, 120, 128, 8);
  ctx.fillRect(0, 0, 8, 128);
  ctx.fillRect(120, 0, 8, 128);
  // Central vertical casement meeting rail + two horizontal muntins
  ctx.fillRect(60, 0, 8, 128);
  ctx.fillRect(0, 40, 128, 5);
  ctx.fillRect(0, 82, 128, 5);

  // Thin shadow line around muntins for crispness
  ctx.strokeStyle = "rgba(62,56,50,0.65)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(8, 8, 52, 32);
  ctx.strokeRect(68, 8, 52, 32);
  ctx.strokeRect(8, 45, 52, 37);
  ctx.strokeRect(68, 45, 52, 37);
  ctx.strokeRect(8, 87, 52, 33);
  ctx.strokeRect(68, 87, 52, 33);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6h. Gothic oak door studded with wrought-iron straps, nail heads & heavy ring knocker (full-arch head, sRGB). */
function createGothicDoorAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 224);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Deep shadowed gothic arch head + heavy dark oak vertical planks
  ctx.fillStyle = "rgb(142,120,98)";
  ctx.fillRect(0, 0, 128, 224);
  const archShadow = ctx.createLinearGradient(0, 0, 0, 56);
  archShadow.addColorStop(0, "rgba(22,16,12,0.72)");
  archShadow.addColorStop(1, "rgba(22,16,12,0.0)");
  ctx.fillStyle = archShadow;
  ctx.fillRect(0, 0, 128, 56);

  ctx.strokeStyle = "rgb(72,56,42)";
  ctx.lineWidth = 3;
  for (let x = 22; x < 128; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 224);
    ctx.stroke();
  }

  // Heavy horizontal wrought-iron strap hinges & rivet heads
  ctx.fillStyle = "rgb(46,44,44)";
  for (const sy of [62, 120, 178]) {
    ctx.fillRect(6, sy, 116, 13);
    ctx.fillStyle = "rgb(114,112,114)";
    for (let rx = 16; rx < 118; rx += 20) {
      ctx.beginPath();
      ctx.arc(rx, sy + 6.5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgb(46,44,44)";
  }

  // Heavy iron ring knocker
  ctx.strokeStyle = "rgb(142,136,130)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(88, 148, 11, 0, Math.PI * 2);
  ctx.stroke();

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6h-2. Renaissance coffered wooden portal doors (kazetová vrata s rozetami + obloukový nadsvětlík, sRGB). */
function createRenaissanceDoorAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 224);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Top semicircular arch transom (leaded fanlight / recessed oak tympanum so arch top is 100% filled)
  ctx.fillStyle = "rgb(52,42,34)";
  ctx.fillRect(0, 0, 128, 52);
  ctx.strokeStyle = "rgb(168,144,114)";
  ctx.lineWidth = 3;
  for (let a = 1; a <= 5; a++) {
    const ang = Math.PI + (a * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(64, 52);
    ctx.lineTo(64 + Math.cos(ang) * 60, 52 + Math.sin(ang) * 50);
    ctx.stroke();
  }
  // Carved transom beam
  ctx.fillStyle = "rgb(112,84,58)";
  ctx.fillRect(0, 48, 128, 8);

  // Warm polished oak/walnut door leaves below transom
  ctx.fillStyle = "rgb(168,136,104)";
  ctx.fillRect(0, 56, 128, 168);

  // Center double-leaf split line
  ctx.fillStyle = "rgb(66,48,34)";
  ctx.fillRect(62, 56, 4, 168);

  // 2×3 coffered square panels (kazety) with carved central rosettes
  for (const col of [0, 1]) {
    const x0 = col === 0 ? 10 : 72;
    for (let row = 0; row < 3; row++) {
      const y0 = 64 + row * 51;
      ctx.fillStyle = "rgb(118,90,64)";
      ctx.fillRect(x0, y0, 46, 42);
      ctx.fillStyle = "rgb(186,152,118)";
      ctx.fillRect(x0 + 5, y0 + 5, 36, 32);
      ctx.strokeStyle = "rgb(82,60,42)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 5, y0 + 5, 36, 32);

      // Carved central rosette boss
      ctx.fillStyle = "rgb(212,180,142)";
      ctx.beginPath();
      ctx.arc(x0 + 23, y0 + 21, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgb(96,72,50)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  // Brass/iron lock escutcheon
  ctx.fillStyle = "rgb(212,178,104)";
  ctx.fillRect(54, 134, 8, 18);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6h-3. Early Baroque double-leaf carved doors (boltcový/akantový dekor + branka pro pěší + vějířový nadsvětlík, sRGB). */
function createBaroqueDoorAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(128, 224);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Top semicircular Baroque radiating fanlight transom with wrought-iron sunburst
  ctx.fillStyle = "rgb(42,50,52)";
  ctx.fillRect(0, 0, 128, 52);
  ctx.strokeStyle = "rgb(196,174,132)";
  ctx.lineWidth = 2.6;
  for (let a = 1; a <= 7; a++) {
    const ang = Math.PI + (a * Math.PI) / 8;
    ctx.beginPath();
    ctx.moveTo(64, 52);
    ctx.lineTo(64 + Math.cos(ang) * 62, 52 + Math.sin(ang) * 50);
    ctx.stroke();
  }
  ctx.fillStyle = "rgb(96,72,52)";
  ctx.fillRect(0, 48, 128, 8);

  // Deep stately stained walnut
  ctx.fillStyle = "rgb(148,118,90)";
  ctx.fillRect(0, 56, 128, 168);

  // Heavy central astragal post
  ctx.fillStyle = "rgb(86,66,48)";
  ctx.fillRect(60, 56, 8, 168);

  // Left leaf: bold sculpted oval Baroque acanthus/auricular cartouches
  for (const cy of [94, 174]) {
    ctx.fillStyle = "rgb(104,78,56)";
    ctx.fillRect(10, cy - 28, 44, 56);
    ctx.fillStyle = "rgb(198,166,130)";
    ctx.beginPath();
    ctx.ellipse(32, cy, 15, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgb(74,54,38)";
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // Right leaf: top cartouche + inset pedestrian wicket gate (branka pro pěší) cut into lower wing
  ctx.fillStyle = "rgb(104,78,56)";
  ctx.fillRect(74, 66, 44, 42);
  ctx.fillStyle = "rgb(198,166,130)";
  ctx.beginPath();
  ctx.ellipse(96, 87, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pedestrian wicket gate frame & brass handle
  ctx.strokeStyle = "rgb(42,30,22)";
  ctx.lineWidth = 4;
  ctx.strokeRect(76, 118, 42, 98);
  ctx.fillStyle = "rgb(168,136,104)";
  ctx.fillRect(80, 122, 34, 90);
  ctx.strokeStyle = "rgb(96,74,54)";
  ctx.lineWidth = 2;
  ctx.strokeRect(86, 130, 22, 74);
  ctx.fillStyle = "rgb(218,184,106)";
  ctx.fillRect(80, 162, 6, 14);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 6i. Crisp 256×192 Prague 17th-century painted/relief house sign plaque (domovní znamení — U Zlatého slunce / lva, sRGB). */
function createHouseSignAlbedo(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 192);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Sculpted sandstone border frame
  ctx.fillStyle = "rgb(218,208,190)";
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = "rgb(122,110,94)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 182);

  // Deep heraldic crimson cartouche field
  ctx.fillStyle = "rgb(98,40,36)";
  ctx.fillRect(22, 20, 212, 114);
  ctx.strokeStyle = "rgb(224,186,98)";
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 24, 204, 106);

  // Corner gold studs
  ctx.fillStyle = "rgb(232,196,104)";
  for (const [cx, cy] of [
    [36, 34],
    [220, 34],
    [36, 120],
    [220, 120],
  ]) {
    ctx.beginPath();
    ctx.arc(cx!, cy!, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylized gilded house emblem (radiant Prague golden sun / lion medallion)
  ctx.fillStyle = "rgb(238,198,98)";
  ctx.beginPath();
  ctx.arc(128, 77, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgb(138,94,32)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "rgb(238,198,98)";
  ctx.lineWidth = 4;
  for (let a = 0; a < 12; a++) {
    const ang = (a * Math.PI) / 6;
    const len = a % 2 === 0 ? 44 : 36;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(ang) * 29, 77 + Math.sin(ang) * 29);
    ctx.lineTo(128 + Math.cos(ang) * len, 77 + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Lower carved inscription tablet (motto / date band)
  ctx.fillStyle = "rgb(234,226,210)";
  ctx.fillRect(30, 144, 196, 28);
  ctx.strokeStyle = "rgb(112,100,86)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 144, 196, 28);
  ctx.fillStyle = "rgb(74,66,58)";
  ctx.fillRect(58, 155, 140, 6);

  return finalizeTexture(canvas, { isColor: true, repeatX: 1, repeatY: 1, anisotropy });
}

/** 7. Four distinct procedural Caravaggio/Rembrandt Baroque oil paintings (sRGB). */
function createChiaroscuroPainting(
  variant: 0 | 1 | 2 | 3,
  anisotropy: number,
): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 192);
  if (!pair) return null;
  const [canvas, ctx] = pair;
  const rand = mulberry32(164810 + variant * 97);

  // Deep Caravaggio tenebrism umber ground
  const bg = ctx.createRadialGradient(108, 82, 12, 128, 96, 155);
  if (variant === 0) {
    // Grand Prior Knight of Malta portrait
    bg.addColorStop(0, "#4a2716");
    bg.addColorStop(0.55, "#1f120d");
    bg.addColorStop(1, "#0b0706");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 192);

    // Crimson velvet cloak & shoulders
    ctx.fillStyle = "#6e161d";
    ctx.beginPath();
    ctx.ellipse(128, 178, 72, 68, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Golden highlight on left shoulder
    const cloakHi = ctx.createLinearGradient(65, 110, 145, 175);
    cloakHi.addColorStop(0, "rgba(218, 122, 58, 0.45)");
    cloakHi.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cloakHi;
    ctx.fillRect(58, 110, 95, 82);

    // White lace collar / Baroque ruff
    ctx.fillStyle = "#e8dec8";
    ctx.beginPath();
    ctx.ellipse(128, 116, 26, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Candlelit face emerging from shadow
    const faceGrad = ctx.createRadialGradient(118, 78, 4, 126, 84, 30);
    faceGrad.addColorStop(0, "#f2c696");
    faceGrad.addColorStop(0.55, "#b37345");
    faceGrad.addColorStop(1, "#301a11");
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(126, 84, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gilded Maltese cross on breast
    ctx.fillStyle = "#f4e5c3";
    ctx.fillRect(114, 142, 28, 7);
    ctx.fillRect(124.5, 131.5, 7, 28);
  } else if (variant === 1) {
    // Nocturnal Prague Hradčany & Vltava moonlight vista
    bg.addColorStop(0, "#5c6f8a");
    bg.addColorStop(0.45, "#1b2434");
    bg.addColorStop(1, "#090c12");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 192);

    // Moon breaking through Baroque storm clouds
    const moon = ctx.createRadialGradient(84, 52, 4, 84, 52, 52);
    moon.addColorStop(0, "#fef3c7");
    moon.addColorStop(0.25, "rgba(226,232,240,0.45)");
    moon.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(24, 0, 130, 110);

    // Castle & St. Vitus cathedral silhouette
    ctx.fillStyle = "#11141c";
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(42, 118);
    ctx.lineTo(70, 96);
    ctx.lineTo(116, 94);
    ctx.lineTo(124, 60);
    ctx.lineTo(136, 94);
    ctx.lineTo(176, 98);
    ctx.lineTo(205, 112);
    ctx.lineTo(256, 122);
    ctx.lineTo(256, 192);
    ctx.lineTo(0, 192);
    ctx.closePath();
    ctx.fill();

    // Golden shimmer across Vltava river
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = `rgba(251, 191, 36, ${0.14 + rand() * 0.28})`;
      ctx.fillRect(58 + rand() * 90, 136 + i * 3.2, 18 + rand() * 34, 1.8);
    }
  } else if (variant === 2) {
    // Baroque Vanitas Still Life (Golden chalice, candle, parchment)
    bg.addColorStop(0, "#593318");
    bg.addColorStop(0.5, "#1f130c");
    bg.addColorStop(1, "#090605");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 192);

    // Dark walnut table ledge
    ctx.fillStyle = "#2b1910";
    ctx.fillRect(0, 136, 256, 56);

    // Warm candle glow
    const glow = ctx.createRadialGradient(84, 72, 4, 84, 72, 64);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.95)");
    glow.addColorStop(0.35, "rgba(249, 115, 22, 0.42)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(10, 10, 150, 140);

    // Wax taper
    ctx.fillStyle = "#f1e8d6";
    ctx.fillRect(79, 80, 10, 58);

    // Gilded chalice
    ctx.fillStyle = "#d4a73f";
    ctx.beginPath();
    ctx.arc(154, 96, 22, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(149, 114, 10, 24);
    ctx.fillRect(136, 136, 36, 6);

    // Unrolled parchment
    ctx.fillStyle = "#d8c6a3";
    ctx.fillRect(98, 138, 62, 18);
  } else {
    // Allegory of the Crimson Standard in Golden Smoke
    bg.addColorStop(0, "#663a17");
    bg.addColorStop(0.55, "#26150e");
    bg.addColorStop(1, "#0b0707");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 192);

    // Diagonal sunbeam through smoke
    ctx.save();
    ctx.translate(128, 96);
    ctx.rotate(-0.42);
    const beam = ctx.createLinearGradient(0, -120, 0, 120);
    beam.addColorStop(0, "rgba(253, 224, 71, 0.0)");
    beam.addColorStop(0.5, "rgba(251, 191, 36, 0.28)");
    beam.addColorStop(1, "rgba(253, 224, 71, 0.0)");
    ctx.fillStyle = beam;
    ctx.fillRect(-160, -32, 320, 64);
    ctx.restore();

    // Billowing crimson heraldic standard
    ctx.fillStyle = "#991b1b";
    ctx.beginPath();
    ctx.moveTo(86, 42);
    ctx.quadraticCurveTo(156, 28, 196, 68);
    ctx.quadraticCurveTo(152, 102, 86, 98);
    ctx.closePath();
    ctx.fill();
    // Gold emblem on banner
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(136, 68, 14, 0, Math.PI * 2);
    ctx.fill();
    // Pike silhouettes
    ctx.strokeStyle = "#d4a73f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(86, 34);
    ctx.lineTo(86, 178);
    ctx.stroke();
  }

  // Aged Baroque varnish craquelure & vignette
  ctx.strokeStyle = "rgba(18, 10, 6, 0.22)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 24; i++) {
    const x = rand() * 256;
    const y = rand() * 192;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 38, y + (rand() - 0.5) * 32);
    ctx.stroke();
  }

  return finalizeTexture(canvas, { isColor: true, anisotropy });
}

/** 8. Woven Crimson & Gold Maltese Heraldic Tapestry (sRGB). */
function createMalteseTapestryTexture(anisotropy: number): THREE.CanvasTexture | null {
  const pair = makeCanvas(256, 320);
  if (!pair) return null;
  const [canvas, ctx] = pair;

  // Deep cardinal velvet base
  const grad = ctx.createLinearGradient(0, 0, 256, 320);
  grad.addColorStop(0, "#6e151e");
  grad.addColorStop(0.5, "#561118");
  grad.addColorStop(1, "#3b0b10");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 320);

  // Woven textile warp/weft grain
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < 320; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }
  ctx.fillStyle = "rgba(255,235,190,0.05)";
  for (let x = 0; x < 256; x += 4) {
    ctx.fillRect(x, 0, 1, 320);
  }

  // Ornate double gilded brocade border
  ctx.strokeStyle = "#d4a73f";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 292);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(26, 26, 204, 268);

  // Corner gold rosettes
  const corners = [
    [28, 28],
    [228, 28],
    [28, 292],
    [228, 292],
  ];
  ctx.fillStyle = "#facc15";
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx!, cy!, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp eight-pointed Maltese Cross in woven ivory
  ctx.save();
  ctx.translate(128, 152);
  ctx.fillStyle = "#f8f3e6";
  ctx.strokeStyle = "#d4a73f";
  ctx.lineWidth = 2;
  for (let arm = 0; arm < 4; arm++) {
    ctx.save();
    ctx.rotate((arm * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-26, -68);
    ctx.lineTo(0, -50);
    ctx.lineTo(26, -68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Bottom golden fringe tassels
  ctx.fillStyle = "#d4a73f";
  for (let x = 4; x < 256; x += 6) {
    ctx.fillRect(x, 308, 3, 12);
  }

  return finalizeTexture(canvas, { isColor: true, anisotropy });
}

export interface BaroqueTextureSet {
  floorMicroReliefBump: THREE.CanvasTexture | null;
  floorParquetAlbedo: THREE.CanvasTexture | null;
  masonryAshlarBump: THREE.CanvasTexture | null;
  masonryStoneAlbedo: THREE.CanvasTexture | null;
  roofTileBump: THREE.CanvasTexture | null;
  roofTileAlbedo: THREE.CanvasTexture | null;
  sgraffitoFacadeAlbedo: THREE.CanvasTexture | null;
  sgraffitoPatternAlbedo: THREE.CanvasTexture | null;
  renaissanceFrescoAlbedo: THREE.CanvasTexture | null;
  gothicPlasterAlbedo: THREE.CanvasTexture | null;
  baroqueStuccoAlbedo: THREE.CanvasTexture | null;
  smoothLimeAlbedo: THREE.CanvasTexture | null;
  windowPaneAlbedo: THREE.CanvasTexture | null;
  gothicWindowAlbedo: THREE.CanvasTexture | null;
  baroqueWindowAlbedo: THREE.CanvasTexture | null;
  gothicDoorAlbedo: THREE.CanvasTexture | null;
  renaissanceDoorAlbedo: THREE.CanvasTexture | null;
  baroqueDoorAlbedo: THREE.CanvasTexture | null;
  houseSignAlbedo: THREE.CanvasTexture | null;
  flutedColumnBump: THREE.CanvasTexture | null;
  carvedWalnutBump: THREE.CanvasTexture | null;
  gildedFiligreeBump: THREE.CanvasTexture | null;
  waterRippleBump: THREE.CanvasTexture | null;
  paintingTextures: (THREE.CanvasTexture | null)[];
  malteseTapestryTexture: THREE.CanvasTexture | null;
}

let cachedTextures: BaroqueTextureSet | null = null;

/**
 * Returns a singleton cached set of procedural Baroque PBR textures.
 * Safe in headless/Node environments (returns nulls when `document` is absent).
 */
export function getBaroqueTextureSet(maxAnisotropy = 4): BaroqueTextureSet {
  if (cachedTextures) return cachedTextures;
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));
  let lazyPaintings: (THREE.CanvasTexture | null)[] | null = null;
  let lazyTapestry: THREE.CanvasTexture | null | undefined = undefined;
  cachedTextures = {
    floorMicroReliefBump: createFloorMicroReliefBump(aniso),
    floorParquetAlbedo: createFloorParquetAlbedo(aniso),
    masonryAshlarBump: createMasonryAshlarBump(aniso),
    masonryStoneAlbedo: createMasonryStoneAlbedo(aniso),
    roofTileBump: createRoofTileBump(aniso),
    roofTileAlbedo: createRoofTileAlbedo(aniso),
    sgraffitoFacadeAlbedo: createSgraffitoFacadeAlbedo(aniso),
    sgraffitoPatternAlbedo: createSgraffitoPatternAlbedo(aniso),
    renaissanceFrescoAlbedo: createRenaissanceFrescoAlbedo(aniso),
    gothicPlasterAlbedo: createGothicPlasterAlbedo(aniso),
    baroqueStuccoAlbedo: createBaroqueStuccoAlbedo(aniso),
    smoothLimeAlbedo: createSmoothLimeAlbedo(aniso),
    windowPaneAlbedo: createWindowPaneAlbedo(aniso),
    gothicWindowAlbedo: createGothicWindowAlbedo(aniso),
    baroqueWindowAlbedo: createBaroqueWindowAlbedo(aniso),
    gothicDoorAlbedo: createGothicDoorAlbedo(aniso),
    renaissanceDoorAlbedo: createRenaissanceDoorAlbedo(aniso),
    baroqueDoorAlbedo: createBaroqueDoorAlbedo(aniso),
    houseSignAlbedo: createHouseSignAlbedo(aniso),
    flutedColumnBump: createFlutedColumnBump(aniso),
    carvedWalnutBump: createCarvedWalnutBump(aniso),
    gildedFiligreeBump: createGildedFiligreeBump(aniso),
    waterRippleBump: createWaterRippleBump(aniso),
    get paintingTextures() {
      if (!lazyPaintings) {
        lazyPaintings = [
          createChiaroscuroPainting(0, aniso),
          createChiaroscuroPainting(1, aniso),
          createChiaroscuroPainting(2, aniso),
          createChiaroscuroPainting(3, aniso),
        ];
      }
      return lazyPaintings;
    },
    get malteseTapestryTexture() {
      if (lazyTapestry === undefined) {
        lazyTapestry = createMalteseTapestryTexture(aniso);
      }
      return lazyTapestry;
    },
  };
  return cachedTextures;
}
