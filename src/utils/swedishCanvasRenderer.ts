/**
 * HTML5 2D Canvas Cut-out Skeletal Renderer for 1648 Prague Defenders & Swedish Troops
 * (/src/utils/swedishCanvasRenderer.ts).
 *
 * Implements:
 * - Heroic 3/4 Baroque silhouette proportions for both Prague Defenders (Pražané) and Swedish Army
 * - Authentic 1648 Prague Defender costumes & gear:
 *   * Field Marshal Rudolf Count Colloredo: billowing pleated white linen nightshirt (`noční košile`)
 *     reaching below the knees with gold embroidered hem, ruffled lace collar, scarlet Order of Malta
 *     Grand Prior ribbon & 8-pointed white Maltese cross pendant, wax-sealed parchment scroll,
 *     crimson velvet nightcap with silver hair curls, bare lower legs in crimson velvet slippers (`trepky`)
 *     with gold buckles, carved walking cane with golden knob, and silver wheellock pistol
 *   * Father Jiří Plachý S.J.: towering (~2m) black Jesuit cassock (`sutana`) with 20 buttons,
 *     steel military gorget (`nákrčník`), 4-ridged black Jesuit biretta (`biret`), raised gilded crucifix
 *     in left hand, and wheellock pistol in right hand
 *   * Havel Řezáč (Old Town Butchers' Guild): russet-brown artisan tunic, blood-stained cream linen
 *     butcher's apron, wide felt burgher hat, heavy steel butcher's cleaver (`řeznický sekáč`), & pistol
 *   * Ondřej Štěrba (rooftop & rope scout): dark slate cloak, diagonal coiled hemp climbing rope across
 *     chest, low cavalier cap, rope knife, & wheellock pistol
 *   * Clementinum Student Legion (`Václav z Michalovic`, `Žák Klementina`): dark academic coat with
 *     gold university trim, white scholar collar, Bohemian red-white ribbon cockade, captured M1624
 *     lightened musket or student wheellock pistol
 *   * Valet Jan Matěj & Maltese Master Armorer Brother Bartoloměj: buff coat / three-quarter plate
 *     cuirass with white 8-pointed Maltese cross, wheellock dragoon carbine, or heavy matchlock + furketa
 * - Camera-relative horizontal facing flip (`facingSign: 1 | -1`)
 * - Two-bone IK arms, damped secondary motion physics, and multi-stage black-powder firing VFX
 */

import {
  createSwedishRigState,
  resolveUsesFurketa,
  solveTwoBoneIK,
  type SwedishRigPose,
  type SwedishTroopProfile,
  type Vec2,
} from "./swedishRig2D";

export const SWEDISH_CANVAS_W = 420;
export const SWEDISH_CANVAS_H = 420;

const OUTLINE = "#0b0908";
const RIM_HIGHLIGHT = "rgba(255, 245, 214, 0.34)";

function seeded01(seed: number, idx: number): number {
  const x = Math.sin(seed * 12.9898 + idx * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function drawRoundedLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  fill: string | CanvasGradient,
  stroke = OUTLINE,
  lineWidth = 3.0,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0 * 0.5, y0 + ny * w0 * 0.5);
  ctx.lineTo(x1 + nx * w1 * 0.5, y1 + ny * w1 * 0.5);
  ctx.lineTo(x1 - nx * w1 * 0.5, y1 - ny * w1 * 0.5);
  ctx.lineTo(x0 - nx * w0 * 0.5, y0 - ny * w0 * 0.5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawMudSplatters(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  intensity: number,
  seed: number,
  count: number,
) {
  if (intensity <= 0.05) return;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const rx = (seeded01(seed, i * 3 + 1) - 0.5) * width;
    const ry = seeded01(seed, i * 3 + 2) * height;
    const radX = 2.6 + seeded01(seed, i * 3 + 3) * 5.8;
    const radY = 1.6 + seeded01(seed, i * 3 + 4) * 3.4;
    ctx.fillStyle =
      i % 2 === 0
        ? `rgba(36, 26, 17, ${0.3 * intensity})`
        : `rgba(56, 42, 28, ${0.24 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(cx + rx, cy + ry, radX, radY, seeded01(seed, i) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMetalScratches(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  seed: number,
  count: number,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(226, 232, 240, 0.38)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const sx = cx + (seeded01(seed + 19, i * 4) - 0.5) * w;
    const sy = cy + (seeded01(seed + 19, i * 4 + 1) - 0.5) * h;
    const ang = (seeded01(seed + 19, i * 4 + 2) - 0.5) * 1.6;
    const len = 4.5 + seeded01(seed + 19, i * 4 + 3) * 9.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws an 8-pointed white Order of Malta cross (`Maltézský kříž`) centered at (cx, cy). */
function drawMalteseCross(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  strokeColor = "#991b1b",
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.6;

  for (let arm = 0; arm < 4; arm++) {
    ctx.save();
    ctx.rotate((arm * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-radius * 0.42, -radius);
    ctx.lineTo(0, -radius * 0.72);
    ctx.lineTo(radius * 0.42, -radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws an articulated heroic-proportion 1648 leg:
 * - Standard: Pluderhosen breeches gathered at knee -> wool stocking -> `skor` or `riding_boots`
 * - Colloredo (`night_slippers`): white nightshirt inner fold -> bare lower calf -> crimson velvet
 *   bedroom slippers (`trepky`) with gold buckle!
 */
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  hipAngle: number,
  kneeAngle: number,
  profile: SwedishTroopProfile,
  isBack: boolean,
) {
  const thighLen = 40;
  const shinLen = 46;

  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(hipAngle);

  // 1. Upper leg (Pluderhosen breeches OR inner linen fold of nightshirt/cassock)
  const breechGrad = ctx.createLinearGradient(-18, 0, 18, thighLen);
  breechGrad.addColorStop(0, isBack ? profile.breechesShadow : profile.breechesColor);
  breechGrad.addColorStop(0.65, profile.breechesShadow);
  breechGrad.addColorStop(1, profile.garmentCut === "nightshirt" ? "#94a3b8" : "#16110e");

  ctx.beginPath();
  ctx.moveTo(-15, -3);
  ctx.quadraticCurveTo(-24, thighLen * 0.52, -14, thighLen);
  ctx.lineTo(15, thighLen);
  ctx.quadraticCurveTo(24, thighLen * 0.48, 15, -3);
  ctx.closePath();
  ctx.fillStyle = breechGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  if (profile.garmentCut === "kabatec") {
    // Vertical cloth fold creases on gathered breeches
    ctx.strokeStyle = "rgba(10, 8, 8, 0.34)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(-9, thighLen * 0.5, -5, thighLen - 4);
    ctx.moveTo(6, 4);
    ctx.quadraticCurveTo(9, thighLen * 0.5, 5, thighLen - 4);
    ctx.stroke();

    // Knee garter ribbon tying breeches just below knee
    ctx.fillStyle = profile.ribbonColor;
    ctx.fillRect(-14, thighLen - 5, 28, 6.5);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, thighLen - 5, 28, 6.5);
  }

  // 2. Knee joint -> lower leg (stockings/bare calves & footwear)
  ctx.translate(0, thighLen);
  ctx.rotate(kneeAngle);

  if (profile.footwear === "night_slippers") {
    // Field Marshal Colloredo: bare lower calves/ankles emerging from his nightshirt + crimson velvet slippers!
    const calfGrad = ctx.createLinearGradient(-10, 0, 11, shinLen);
    calfGrad.addColorStop(0, isBack ? "#c99f7d" : profile.stockingsColor);
    calfGrad.addColorStop(1, isBack ? "#a67d5e" : "#dfa982");
    drawRoundedLimb(ctx, 0, 0, 0, shinLen - 3, 17.5, 13, calfGrad, OUTLINE, 2.7);

    // White linen bandage wrapped around his Lützen 1632 wounded back calf (with faint dried-blood spot)
    if (isBack && profile.hasLimp) {
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-9.2, 8, 18.4, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8.5, 13);
      ctx.lineTo(8.5, 16);
      ctx.moveTo(-8.5, 19);
      ctx.lineTo(8.5, 22);
      ctx.stroke();
      ctx.fillStyle = "rgba(185, 28, 28, 0.52)";
      ctx.beginPath();
      ctx.ellipse(2, 17, 3.6, 2.4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aristocratic crimson velvet bedroom slipper (`trepka`) with gold buckle
    ctx.beginPath();
    ctx.moveTo(-10, shinLen - 6);
    ctx.quadraticCurveTo(4, shinLen - 11, 24, shinLen - 1);
    ctx.lineTo(24, shinLen + 8.5);
    ctx.lineTo(-12, shinLen + 8.5);
    ctx.closePath();
    ctx.fillStyle = isBack ? "#7f1d1d" : profile.bootColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Gold slipper trim & buckle
    ctx.fillStyle = "#facc15";
    ctx.fillRect(3, shinLen - 6, 7.5, 5.5);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(3, shinLen - 6, 7.5, 5.5);
  } else if (profile.footwear === "riding_boots") {
    const bootGrad = ctx.createLinearGradient(-14, 0, 16, shinLen);
    bootGrad.addColorStop(0, isBack ? "#18110c" : "#442e20");
    bootGrad.addColorStop(0.55, profile.bootColor);
    bootGrad.addColorStop(1, "#0d0907");

    // Wide bucket cuff just below knee
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(19, -5);
    ctx.lineTo(15, 14);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fillStyle = isBack ? "#261a12" : "#543825";
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    drawRoundedLimb(ctx, 0, 9, 1, shinLen + 2, 23, 18, bootGrad, OUTLINE, 3.0);

    ctx.beginPath();
    ctx.moveTo(-10, shinLen - 5);
    ctx.lineTo(25, shinLen - 1);
    ctx.lineTo(26, shinLen + 10);
    ctx.lineTo(-13, shinLen + 10);
    ctx.closePath();
    ctx.fillStyle = profile.bootColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Brass riding spur at heel
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, shinLen + 3);
    ctx.lineTo(-20, shinLen + 1);
    ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-21, shinLen + 1, 3.0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Contrasting knitted wool stockings + low square-toed shoes (`skor`) with brass buckle
    const stockGrad = ctx.createLinearGradient(-11, 0, 12, shinLen);
    stockGrad.addColorStop(0, isBack ? "#2b2624" : profile.stockingsColor);
    stockGrad.addColorStop(1, isBack ? "#171413" : profile.stockingsColor);
    drawRoundedLimb(ctx, 0, 0, 0, shinLen - 4, 19, 14, stockGrad, OUTLINE, 2.8);

    if (isBack) {
      ctx.fillStyle = "rgba(10, 10, 14, 0.36)";
      ctx.fillRect(-10, 0, 20, shinLen - 4);
    } else {
      ctx.strokeStyle = "rgba(255, 250, 235, 0.22)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(-3, shinLen - 10);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(-10, shinLen - 8);
    ctx.lineTo(6, shinLen - 12);
    ctx.lineTo(24, shinLen - 1);
    ctx.lineTo(24, shinLen + 9);
    ctx.lineTo(-12, shinLen + 9);
    ctx.closePath();
    ctx.fillStyle = profile.bootColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(2, shinLen - 6, 7.5, 5.5);
  }

  drawMudSplatters(
    ctx,
    2,
    shinLen - 14,
    28,
    20,
    profile.mudIntensity,
    profile.scratchSeed + (isBack ? 7 : 13),
    5,
  );

  ctx.restore();
}

/**
 * Draws an arm using two-bone IK results (shoulder -> elbow -> hand).
 * For Colloredo's `nightshirt`, draws billowing white linen sleeves gathered at the wrist with lace ruffles!
 */
function drawIKArm(
  ctx: CanvasRenderingContext2D,
  ik: ReturnType<typeof solveTwoBoneIK>,
  profile: SwedishTroopProfile,
  isBack: boolean,
) {
  const { shoulder, elbow, hand } = ik;

  ctx.save();
  const upperGrad = ctx.createLinearGradient(shoulder.x, shoulder.y - 12, elbow.x, elbow.y + 12);
  upperGrad.addColorStop(0, isBack ? profile.coatShadow : profile.coatLight);
  upperGrad.addColorStop(0.58, isBack ? profile.coatShadow : profile.coatBase);
  upperGrad.addColorStop(1, profile.coatShadow);

  if (profile.garmentCut === "nightshirt") {
    // Billowing white linen nightshirt sleeves with soft pleats & ruffled lace wrist cuff
    drawRoundedLimb(ctx, shoulder.x, shoulder.y, elbow.x, elbow.y, 24, 21, upperGrad, OUTLINE, 3.0);
    drawRoundedLimb(ctx, elbow.x, elbow.y, hand.x, hand.y, 21, 14, upperGrad, OUTLINE, 2.8);

    // Ruffled gold-trimmed nightshirt wrist cuff
    const forearmDx = hand.x - elbow.x;
    const forearmDy = hand.y - elbow.y;
    const cuffX = elbow.x + forearmDx * 0.78;
    const cuffY = elbow.y + forearmDy * 0.78;
    drawRoundedLimb(
      ctx,
      cuffX,
      cuffY,
      hand.x,
      hand.y,
      18,
      15,
      isBack ? "#e2e8f0" : "#ffffff",
      OUTLINE,
      2.2,
    );
  } else {
    drawRoundedLimb(ctx, shoulder.x, shoulder.y, elbow.x, elbow.y, 22, 18, upperGrad, OUTLINE, 3.0);

    const forearmDx = hand.x - elbow.x;
    const forearmDy = hand.y - elbow.y;
    const cuffStartX = elbow.x + forearmDx * 0.54;
    const cuffStartY = elbow.y + forearmDy * 0.54;
    const cuffEndX = elbow.x + forearmDx * 0.84;
    const cuffEndY = elbow.y + forearmDy * 0.84;

    drawRoundedLimb(ctx, elbow.x, elbow.y, cuffStartX, cuffStartY, 18, 16.5, upperGrad, OUTLINE, 2.8);

    // Turned-back regimental / guild sleeve cuff (`vyložení rukávů`)
    drawRoundedLimb(
      ctx,
      cuffStartX,
      cuffStartY,
      cuffEndX,
      cuffEndY,
      19.5,
      20.5,
      isBack ? profile.liningColor : profile.cuffColor,
      OUTLINE,
      2.8,
    );

    // White linen shirt sleeve peeking out beneath the wool cuff
    drawRoundedLimb(
      ctx,
      cuffEndX,
      cuffEndY,
      hand.x,
      hand.y,
      14,
      11.5,
      isBack ? "#bdb5a5" : profile.shirtColor,
      OUTLINE,
      2.2,
    );
  }

  // Hand / leather gauntlet gripping weapon
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 8.0, 0, Math.PI * 2);
  ctx.fillStyle = profile.isBuffLeather ? "#8d6235" : isBack ? "#be9473" : profile.skinTone;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  if (isBack) {
    ctx.fillStyle = "rgba(10, 12, 18, 0.22)";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 8.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the wide circular heavy wool rain cloak (`Kapp` / `plášť`) behind the torso,
 * billowing dynamically with `pose.cloakSwing`.
 */
function drawBackCloak(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
) {
  if (!profile.hasCloak) return;
  const sway = pose.cloakSwing * 50;
  const ripple = Math.sin(pose.time * 4.2 + pose.stridePhase) * 4.8;

  ctx.save();
  const cloakGrad = ctx.createLinearGradient(-56, -70, 28, 66);
  cloakGrad.addColorStop(0, profile.cloakColor);
  cloakGrad.addColorStop(0.68, profile.cloakShadow);
  cloakGrad.addColorStop(1, "#090a0e");

  ctx.beginPath();
  ctx.moveTo(-24, -70);
  ctx.quadraticCurveTo(-58 + sway * 0.45, -14, -64 + sway + ripple, 58);
  ctx.quadraticCurveTo(-20 + sway * 0.7, 72 + ripple * 0.5, 28 + sway * 0.35, 54);
  ctx.lineTo(30, -66);
  ctx.closePath();
  ctx.fillStyle = cloakGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-54 + sway + ripple, 55);
  ctx.quadraticCurveTo(-34 + sway * 0.6, 20, -28, -42);
  ctx.lineTo(-16, 50);
  ctx.closePath();
  ctx.fillStyle = profile.cloakLining;
  ctx.globalAlpha = 0.58;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(8, 8, 12, 0.35)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-30, -52);
  ctx.quadraticCurveTo(-46 + sway * 0.5, 6, -42 + sway * 0.8, 52);
  ctx.stroke();

  drawMudSplatters(ctx, -20 + sway * 0.6, 42, 64, 20, profile.mudIntensity, profile.scratchSeed + 3, 6);
  ctx.restore();
}

/**
 * Draws the Occultist's asymmetric war banner behind his back (Mission 2 Pillar 3 silhouette).
 */
function drawBackBanner(ctx: CanvasRenderingContext2D, pose: SwedishRigPose) {
  const flutter = pose.cloakSwing * 14 + Math.sin(pose.time * 5.2) * 5;
  ctx.save();
  ctx.strokeStyle = "#6c421c";
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-26, -48);
  ctx.lineTo(-40, -162);
  ctx.stroke();

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-64, -152);
  ctx.lineTo(-16, -146);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-62, -150);
  ctx.lineTo(-18, -145);
  ctx.quadraticCurveTo(-20 + flutter * 0.5, -110, -14 + flutter, -82);
  ctx.lineTo(-38 + flutter * 0.7, -96);
  ctx.lineTo(-60 + flutter * 0.85, -80);
  ctx.closePath();
  ctx.fillStyle = "#1e3a8a";
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(-39 + flutter * 0.35, -118, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the torso garment & body armor layer:
 * - `nightshirt` (Field Marshal Colloredo): Long billowing white-cream linen nightshirt (`noční košile`)
 *   reaching below the knees (`y = +54`), vertical linen pleats, golden embroidered lower border,
 *   open V-neck with lace tie, and NO waist armor/belt!
 * - `jesuit_cassock` (Father Jiří Plachý): Long ankle-length black Jesuit cassock (`sutana`) reaching
 *   `y = +60` with 14 small black cassock buttons down the front and black cincture sash at waist.
 * - `kabatec`: Broad mid-thigh 1648 Kabátec (vadmal wool coat, scholar tunic, or buff-leather Kolet),
 *   flexing skirts with `pose.coatHemSwing`, tin/brass buttons, waist belt, optional butcher's blood-stained
 *   linen apron (Havel), leather spark apron (Constable), or blackened iron cuirass/tassets.
 */
function drawTorsoAndArmor(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
) {
  const hemSwing = pose.coatHemSwing * 30;
  const breath = pose.chestLift;

  ctx.save();

  if (profile.garmentCut === "nightshirt") {
    // --- FIELD MARSHAL COLLOREDO'S FLOWING WHITE LINEN NIGHTSHIRT (`NOČNÍ KOŠILE`) ---
    const shirtGrad = ctx.createLinearGradient(-44, -74, 46, 56);
    shirtGrad.addColorStop(0, "#ffffff");
    shirtGrad.addColorStop(0.55, profile.coatBase);
    shirtGrad.addColorStop(1, profile.coatShadow);

    const ripple = Math.sin(pose.time * 4.5 + pose.stridePhase) * 3.5;

    ctx.beginPath();
    ctx.moveTo(-33, -72 - breath * 0.5);
    ctx.lineTo(33, -72 - breath * 0.5);
    ctx.quadraticCurveTo(43, -14, 50 + hemSwing * 0.95, 41);
    // Scalloped billowing knee-length nightshirt hem revealing bare calves, bandage & crimson slippers
    ctx.quadraticCurveTo(24 + hemSwing * 0.85, 47 + ripple, 0 + hemSwing * 0.75, 42 - ripple * 0.5);
    ctx.quadraticCurveTo(-24 + hemSwing * 0.85, 47 - ripple, -48 + hemSwing * 0.95, 39);
    ctx.quadraticCurveTo(-41, -14, -33, -72 - breath * 0.5);
    ctx.closePath();
    ctx.fillStyle = shirtGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Vertical soft linen drape pleats down the nightshirt
    ctx.strokeStyle = "rgba(100, 116, 139, 0.42)";
    ctx.lineWidth = 2.0;
    for (const px of [-24, -10, 8, 24]) {
      ctx.beginPath();
      ctx.moveTo(px * 0.75, -52);
      ctx.quadraticCurveTo(px + hemSwing * 0.45, 0, px * 1.32 + hemSwing * 0.85, 37);
      ctx.stroke();
    }

    // Aristocratic gold brocade embroidery along the bottom hem of the nightshirt
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-45 + hemSwing * 0.92, 34);
    ctx.quadraticCurveTo(0 + hemSwing * 0.78, 41, 47 + hemSwing * 0.92, 35);
    ctx.stroke();

    // Unbuttoned V-neck placket at chest with dangling golden bed-cord ties
    ctx.fillStyle = profile.skinTone;
    ctx.beginPath();
    ctx.moveTo(-7, -68 - breath * 0.4);
    ctx.lineTo(7, -68 - breath * 0.4);
    ctx.lineTo(1, -46 - breath * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -56);
    ctx.quadraticCurveTo(-11 + hemSwing * 0.3, -44, -9 + hemSwing * 0.4, -36);
    ctx.moveTo(5, -56);
    ctx.quadraticCurveTo(12 + hemSwing * 0.3, -44, 10 + hemSwing * 0.4, -36);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (profile.garmentCut === "jesuit_cassock") {
    // --- FATHER JIŘÍ PLACHÝ'S ANKLE-LENGTH BLACK JESUIT CASSOCK (`SUTANA`) ---
    const cassockGrad = ctx.createLinearGradient(-44, -76, 44, 62);
    cassockGrad.addColorStop(0, "#3f434d");
    cassockGrad.addColorStop(0.42, profile.coatBase);
    cassockGrad.addColorStop(1, profile.coatShadow);

    ctx.beginPath();
    ctx.moveTo(-33, -72 - breath * 0.5);
    ctx.lineTo(33, -72 - breath * 0.5);
    ctx.quadraticCurveTo(42, -12, 50 + hemSwing * 0.9, 58);
    ctx.lineTo(10 + hemSwing * 0.65, 60);
    ctx.lineTo(2, 22);
    ctx.lineTo(-6 + hemSwing * 0.6, 60);
    ctx.lineTo(-48 + hemSwing * 0.9, 56);
    ctx.quadraticCurveTo(-40, -12, -33, -72 - breath * 0.5);
    ctx.closePath();
    ctx.fillStyle = cassockGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Crisp warm chiaroscuro rim highlight so the black cassock separates cleanly from dark night water
    ctx.strokeStyle = "rgba(226, 232, 240, 0.46)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-30, -69 - breath * 0.5);
    ctx.quadraticCurveTo(-37, -14, -44 + hemSwing * 0.85, 50);
    ctx.stroke();
    ctx.strokeStyle = "rgba(254, 240, 138, 0.24)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(30, -69 - breath * 0.5);
    ctx.quadraticCurveTo(38, -14, 46 + hemSwing * 0.85, 52);
    ctx.stroke();

    // Center cassock seam + dense vertical row of small Jesuit buttons
    ctx.strokeStyle = "#09090b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(3, -64 - breath * 0.4);
    ctx.lineTo(3, 52);
    ctx.stroke();

    ctx.fillStyle = "#3f3f46";
    for (let y = -56; y <= 38; y += 8.5) {
      ctx.beginPath();
      ctx.arc(3.5, y - breath * 0.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Black Jesuit fabric cincture sash tied at waist + leather pistol belt
    ctx.fillStyle = "#18181b";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(-36, -15, 72, 12, 3);
    ctx.fill();
    ctx.stroke();

    // Brass buckle
    ctx.fillStyle = "#d4a73f";
    ctx.fillRect(-3, -16, 13, 14);
    ctx.strokeRect(-3, -16, 13, 14);

    drawMudSplatters(ctx, hemSwing * 0.6, 36, 82, 22, profile.mudIntensity, profile.scratchSeed + 11, 8);
  } else {
    // --- STANDARD 1648 KABÁTEC / KOLET / SCHOLAR COAT / ARTISAN TUNIC ---
    const coatGrad = ctx.createLinearGradient(-44, -76, 44, 48);
    coatGrad.addColorStop(0, profile.coatLight);
    coatGrad.addColorStop(0.45, profile.coatBase);
    coatGrad.addColorStop(1, profile.coatShadow);

    ctx.beginPath();
    ctx.moveTo(-33, -72 - breath * 0.5);
    ctx.lineTo(33, -72 - breath * 0.5);
    ctx.quadraticCurveTo(40, -24, 46 + hemSwing * 0.85, 36);
    ctx.lineTo(13 + hemSwing * 0.5, 39);
    ctx.lineTo(4, 10);
    ctx.lineTo(-7 + hemSwing * 0.4, 39);
    ctx.lineTo(-44 + hemSwing * 0.9, 34);
    ctx.quadraticCurveTo(-38, -24, -33, -72 - breath * 0.5);
    ctx.closePath();
    ctx.fillStyle = coatGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Warm Baroque Chiaroscuro rim highlight
    ctx.strokeStyle = RIM_HIGHLIGHT;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-30, -69 - breath * 0.5);
    ctx.quadraticCurveTo(-35, -26, -40 + hemSwing * 0.82, 28);
    ctx.stroke();

    // Regimental / academic lining peeking at lower coat turnbacks
    ctx.beginPath();
    ctx.moveTo(-44 + hemSwing * 0.9, 34);
    ctx.lineTo(-29 + hemSwing * 0.7, 17);
    ctx.lineTo(-19 + hemSwing * 0.65, 36);
    ctx.closePath();
    ctx.fillStyle = profile.liningColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(46 + hemSwing * 0.85, 36);
    ctx.lineTo(31 + hemSwing * 0.65, 17);
    ctx.lineTo(23 + hemSwing * 0.6, 37);
    ctx.closePath();
    ctx.fillStyle = profile.liningColor;
    ctx.fill();
    ctx.stroke();

    // Center front seam + buttons / laces
    ctx.strokeStyle = "rgba(15, 12, 10, 0.48)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(4, -66 - breath * 0.4);
    ctx.lineTo(4, 13);
    ctx.stroke();

    if (profile.isBuffLeather) {
      ctx.strokeStyle = "#4d3114";
      ctx.lineWidth = 2.4;
      for (let y = -54; y <= -2; y += 11) {
        ctx.beginPath();
        ctx.moveTo(-3, y);
        ctx.lineTo(11, y);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = profile.buttonColor;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.3;
      for (let y = -56; y <= 6; y += 10.5) {
        ctx.beginPath();
        ctx.arc(5, y - breath * 0.25, 2.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "rgba(10, 10, 14, 0.28)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-29, -18);
    ctx.quadraticCurveTo(0, -12, 29, -18);
    ctx.moveTo(-18, -2);
    ctx.lineTo(-24 + hemSwing * 0.7, 30);
    ctx.moveTo(22, -2);
    ctx.lineTo(28 + hemSwing * 0.7, 30);
    ctx.stroke();

    drawMudSplatters(ctx, hemSwing * 0.5, 14, 78, 22, profile.mudIntensity, profile.scratchSeed + 11, 9);

    // 2. Heavy leather waist belt & shifting-glint brass buckle
    ctx.fillStyle = "#3b2313";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(-36, -15, 72, 12.5, 3);
    ctx.fill();
    ctx.stroke();

    const buckleGrad = ctx.createLinearGradient(
      -5 + pose.specularShift * 7,
      -15,
      14 + pose.specularShift * 7,
      -2,
    );
    buckleGrad.addColorStop(0, "#a16207");
    buckleGrad.addColorStop(0.5, "#fef08a");
    buckleGrad.addColorStop(1, "#854d0e");
    ctx.fillStyle = buckleGrad;
    ctx.fillRect(-3, -16.5, 15, 15);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-3, -16.5, 15, 15);
  }

  // 3A. Optional Blood-Stained Cream Linen Butcher's Apron (Havel Řezáč — Old Town Butchers' Guild)
  if (profile.hasButcherApron) {
    const apronGrad = ctx.createLinearGradient(-26, -54, 28, 44);
    apronGrad.addColorStop(0, "#efe8d8");
    apronGrad.addColorStop(0.6, "#d6cbb5");
    apronGrad.addColorStop(1, "#a89b84");

    ctx.beginPath();
    ctx.moveTo(-22, -54);
    ctx.lineTo(24, -54);
    ctx.lineTo(31 + hemSwing * 0.55, 43);
    ctx.lineTo(-29 + hemSwing * 0.55, 43);
    ctx.closePath();
    ctx.fillStyle = apronGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Authentic butcher's crimson blood smears & work stains on the linen apron
    ctx.fillStyle = "rgba(153, 27, 27, 0.55)";
    ctx.beginPath();
    ctx.ellipse(-6, -8, 13, 7, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(9, 14, 15, 9, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(127, 29, 29, 0.42)";
    ctx.beginPath();
    ctx.ellipse(-2, 24, 11, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Apron waist tie string
    ctx.strokeStyle = "#dfd6c3";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.lineTo(34, -10);
    ctx.stroke();
  }

  // 3B. Optional Heavy Leather Spark Apron & Tool Satchel (Artillery Constable)
  if (profile.hasLeatherApron) {
    const apronGrad = ctx.createLinearGradient(-26, -54, 28, 44);
    apronGrad.addColorStop(0, "#85542f");
    apronGrad.addColorStop(0.55, "#59351a");
    apronGrad.addColorStop(1, "#2a170b");

    ctx.beginPath();
    ctx.moveTo(-23, -56);
    ctx.lineTo(25, -56);
    ctx.lineTo(32 + hemSwing * 0.55, 44);
    ctx.lineTo(-30 + hemSwing * 0.55, 44);
    ctx.closePath();
    ctx.fillStyle = apronGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    drawMudSplatters(ctx, 0, -16, 46, 54, 0.9, profile.scratchSeed + 41, 10);

    if (profile.hasToolSatchel) {
      ctx.fillStyle = "#452411";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-42, -5, 22, 25, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-36, -5);
      ctx.lineTo(-41, -19);
      ctx.stroke();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-28, -5);
      ctx.lineTo(-24, -17);
      ctx.stroke();
    }
  }

  // 4. Optional Blackened Iron Cuirass & Articulated Tassets (Jan Matěj / Brother Bartoloměj / Pikeman / Officer)
  if (profile.hasCuirass) {
    const specX = pose.specularShift * 18;

    if (profile.hasTassets) {
      for (const side of [-1, 1]) {
        const tx = side * 20 + hemSwing * 0.25;
        const tassGrad = ctx.createLinearGradient(tx - 15 + specX * 0.5, -2, tx + 15 + specX * 0.5, 30);
        tassGrad.addColorStop(0, "#1e242e");
        tassGrad.addColorStop(0.45, "#64748b");
        tassGrad.addColorStop(0.55, "#f1f5f9");
        tassGrad.addColorStop(1, "#0f131a");

        ctx.beginPath();
        ctx.roundRect(tx - 15, -2, 30, 30, 4);
        ctx.fillStyle = tassGrad;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.8;
        for (let ly = 7; ly <= 21; ly += 7) {
          ctx.beginPath();
          ctx.moveTo(tx - 14, ly);
          ctx.lineTo(tx + 14, ly);
          ctx.stroke();
        }
      }
    }

    const plateGrad = ctx.createLinearGradient(-32 + specX, -70, 32 + specX, -8);
    plateGrad.addColorStop(0, "#171c24");
    plateGrad.addColorStop(0.36, "#3b4657");
    plateGrad.addColorStop(0.49, "#f8fafc");
    plateGrad.addColorStop(0.62, "#475569");
    plateGrad.addColorStop(1, "#0c1017");

    ctx.beginPath();
    ctx.moveTo(-30, -70 - breath * 0.5);
    ctx.lineTo(30, -70 - breath * 0.5);
    ctx.lineTo(26, -14);
    ctx.lineTo(0, -3);
    ctx.lineTo(-26, -14);
    ctx.closePath();
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(248, 250, 252, 0.58)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -66 - breath * 0.4);
    ctx.lineTo(0, -6);
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    for (const rx of [-24, 24]) {
      for (const ry of [-58, -36, -19]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Brother Bartoloměj wears the 8-pointed white Maltese cross enameled on his breastplate!
    if (profile.hasMalteseCross) {
      drawMalteseCross(ctx, 0, -39 - breath * 0.35, 13.5, "#0f172a");
    }

    drawMetalScratches(ctx, 0, -38, 44, 44, profile.scratchSeed, 7);
  }

  // 5. Sidearm scabbard & hilt at left hip (rapier / katzbalger / palaš / butcher cleaver)
  if (profile.sidearm !== "none") {
    ctx.save();
    ctx.translate(-29, -4);
    ctx.rotate(0.46 + pose.coatHemSwing * 0.25);
    const scabbardLen =
      profile.sidearm === "katzbalger" || profile.sidearm === "cleaver" ? 44 : 66;
    ctx.strokeStyle = "#1c1410";
    ctx.lineWidth = 7.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-scabbardLen, 14);
    ctx.stroke();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-scabbardLen + 9, 12);
    ctx.lineTo(-scabbardLen, 14);
    ctx.stroke();

    ctx.strokeStyle = profile.sidearm === "palash" ? "#facc15" : "#cbd5e1";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(7, -2, 8.5, -Math.PI * 0.65, Math.PI * 0.65);
    ctx.stroke();
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(16, -4);
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(18, -4.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the curved torso equipment layer:
 * - Steel Gorget (`Nákrčník` — Father Jiří Plachý, Jan Matěj, Brother Bartoloměj)
 * - Coiled Hemp Climbing Rope slung across chest (Ondřej Štěrba)
 * - Traditional Bandolier ("Dvanáct apoštolů") with 11-12 individually swinging powder flasks
 * - Waist Cartridge Box (`Patronkök` / `Patrontaška`) with paper cartridges & priming horn
 * - Curved Field Sash (`Šerpa`) or Order of Malta Grand Prior ribbon + 8-pointed Maltese Cross pendant
 * - Fluttering Imperial Wax-Sealed Parchment Scroll at waist (Colloredo & Václav)
 * - Broad white falling linen collar (lace-edged for Colloredo, Jan Matěj, & Odowalsky)
 */
function drawChestEquipment(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
) {
  const breath = pose.chestLift;
  ctx.save();

  // 0A. Coiled Hemp Climbing Rope slung diagonally across chest (Ondřej Štěrba — Thief of Ropes & Roofs)
  if (profile.hasCoiledRope) {
    ctx.save();
    ctx.translate(0, -38 - breath * 0.35);
    ctx.rotate(-0.42);
    for (const rOffset of [-3.5, 0, 3.5]) {
      ctx.strokeStyle = rOffset === 0 ? "#d6b072" : "#9c763c";
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.ellipse(0, rOffset, 35, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 37, 18.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Hemp rope twist ticks
    ctx.strokeStyle = "#573c18";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 1A. Traditional Bandolier ("Dvanáct apoštolů") draped diagonally across chest
  if (profile.hasBandolier) {
    ctx.strokeStyle = "#472c18";
    ctx.lineWidth = 10.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-27, -69 - breath * 0.4);
    ctx.quadraticCurveTo(4, -35, 31, -4);
    ctx.stroke();

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-30, -65 - breath * 0.4);
    ctx.quadraticCurveTo(1, -31, 28, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-24, -73 - breath * 0.4);
    ctx.quadraticCurveTo(7, -39, 34, -8);
    ctx.stroke();

    const count = Math.max(6, Math.min(12, profile.apostleCount));
    const frontCount = Math.min(8, count);
    for (let i = 0; i < frontCount; i++) {
      const u = (i + 0.45) / (frontCount + 0.15);
      const inv = 1 - u;
      const ax = inv * inv * -27 + 2 * inv * u * 4 + u * u * 31;
      const ay = inv * inv * (-69 - breath * 0.4) + 2 * inv * u * -35 + u * u * -4;

      const flaskSwing =
        pose.apostleSwing * (0.85 + u * 0.45) +
        Math.sin(pose.time * 4.8 - i * 0.55) * (pose.state === "march" ? 0.11 : 0.025);

      ctx.save();
      ctx.translate(ax, ay + 2);
      ctx.rotate(flaskSwing);

      ctx.strokeStyle = "#2b190d";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 6);
      ctx.stroke();

      const flaskGrad = ctx.createLinearGradient(-4, 5, 4, 20);
      flaskGrad.addColorStop(0, "#bd8650");
      flaskGrad.addColorStop(0.5, profile.apostleColor);
      flaskGrad.addColorStop(1, "#3a2211");
      ctx.fillStyle = flaskGrad;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-4.0, 5.5, 8.0, 15, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      ctx.fillRect(-3.4, 4.2, 6.8, 3.0);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(31, -2);
    ctx.rotate(pose.apostleSwing * 0.9);
    ctx.fillStyle = "#5c3920";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(2, 13, 9.5, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d8c7a5";
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.quadraticCurveTo(19, 13, 14, 24);
    ctx.quadraticCurveTo(9, 19, 6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 1B. Waist Cartridge Box (`Patronkök` / `Patrontaška`) & Paper Cartridges
  if (profile.hasCartridgeBox) {
    if (!profile.hasBandolier && !profile.hasCoiledRope) {
      ctx.strokeStyle = "#52321b";
      ctx.lineWidth = 7.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-25, -69 - breath * 0.4);
      ctx.quadraticCurveTo(5, -36, 28, -5);
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-28, -66 - breath * 0.4);
      ctx.quadraticCurveTo(2, -33, 25, -2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-22, -72 - breath * 0.4);
      ctx.quadraticCurveTo(8, -39, 31, -8);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(24, -4);
    ctx.rotate(pose.coatHemSwing * 0.38);

    const boxGrad = ctx.createLinearGradient(-12, 0, 14, 24);
    boxGrad.addColorStop(0, "#633c1f");
    boxGrad.addColorStop(0.6, "#3e2310");
    boxGrad.addColorStop(1, "#211208");
    ctx.fillStyle = boxGrad;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(-11, 2, 24, 20, 4);
    ctx.fill();
    ctx.stroke();

    if (profile.usesPaperCartridges) {
      ctx.fillStyle = "#f8f4e8";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.2;
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(-7 + c * 6, -3.5, 4.2, 8);
        ctx.strokeRect(-7 + c * 6, -3.5, 4.2, 8);
      }
    }

    ctx.fillStyle = "#4d2d16";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.lineTo(14, 3);
    ctx.lineTo(12, 13);
    ctx.quadraticCurveTo(1, 17, -10, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(1, 12, 2.8, 0, Math.PI * 2);
    ctx.fill();

    if (!profile.hasBandolier) {
      ctx.fillStyle = "#dfd0b0";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(12, 2);
      ctx.quadraticCurveTo(22, 10, 16, 21);
      ctx.quadraticCurveTo(12, 16, 10, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Curved Field Sash (`Šerpa`) or Scarlet Order of Malta Grand Prior Ribbon
  if (profile.sash) {
    ctx.save();
    ctx.strokeStyle = profile.sash.primary;
    ctx.lineWidth = 13.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(28, -68 - breath * 0.4);
    ctx.quadraticCurveTo(2, -36, -31, -4);
    ctx.stroke();

    ctx.strokeStyle = profile.sash.secondary;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(28, -68 - breath * 0.4);
    ctx.quadraticCurveTo(2, -36, -31, -4);
    ctx.stroke();

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(22, -73 - breath * 0.4);
    ctx.quadraticCurveTo(-4, -41, -37, -9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, -63 - breath * 0.4);
    ctx.quadraticCurveTo(8, -31, -25, 1);
    ctx.stroke();

    const tailSwing = pose.coatHemSwing * 24 + Math.sin(pose.time * 4.5) * 3.5;
    ctx.beginPath();
    ctx.moveTo(-31, -4);
    ctx.lineTo(-42 + tailSwing, 28);
    ctx.lineTo(-26 + tailSwing * 0.9, 32);
    ctx.lineTo(-19, 0);
    ctx.closePath();
    ctx.fillStyle = profile.sash.primary;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.strokeStyle = profile.sash.fringe;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-42 + tailSwing, 28);
    ctx.lineTo(-26 + tailSwing * 0.9, 32);
    ctx.stroke();

    // Order of Malta 8-pointed white Grand Prior Cross pendant suspended over Colloredo's nightshirt!
    if (profile.hasMalteseCross && !profile.hasCuirass) {
      drawMalteseCross(ctx, 2, -33 - breath * 0.35, 14.5, "#7f1d1d");
    }

    ctx.restore();
  }

  // 2B. Wax-Sealed Imperial Parchment Scroll fluttering at waist (Colloredo & Scribe Václav)
  if (profile.hasParchmentScroll) {
    const scrollSwing = pose.coatHemSwing * 20 + Math.sin(pose.time * 4.2) * 2.5;
    ctx.save();
    ctx.translate(28, 4);
    ctx.rotate(scrollSwing * 0.02);
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(18, 6, 16 + scrollSwing * 0.35, 25);
    ctx.lineTo(3 + scrollSwing * 0.3, 22);
    ctx.quadraticCurveTo(4, 10, -4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Red imperial wax seal dangling on gold cord
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = "#450a0a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(11 + scrollSwing * 0.32, 22, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Broad White Falling Linen Collar (`překládaný bílý límec`, ruffled lace for Colloredo/officers)
  if (profile.hasFallingCollar) {
    ctx.save();
    ctx.translate(0, -71 - breath * 0.5);
    ctx.beginPath();
    ctx.moveTo(-22, -3);
    ctx.lineTo(22, -3);
    ctx.lineTo(29, 13);
    ctx.lineTo(5, 8);
    ctx.lineTo(0, 14);
    ctx.lineTo(-5, 8);
    ctx.lineTo(-29, 13);
    ctx.closePath();
    ctx.fillStyle = profile.shirtColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    if (profile.hasLaceTrim) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 2.5]);
      ctx.beginPath();
      ctx.moveTo(-27, 11);
      ctx.lineTo(-5, 6);
      ctx.lineTo(5, 6);
      ctx.lineTo(27, 11);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // 4. Steel Military Gorget (`Nákrčník` — worn at the throat by Father Jiří Plachý, Jan Matěj, & Bartoloměj)
  if (profile.hasGorget) {
    // White clerical linen tabs (`kolárek`) peeking above Father Jiří Plachý's military gorget
    if (profile.garmentCut === "jesuit_cassock") {
      ctx.save();
      ctx.translate(0, -72 - breath * 0.5);
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.0;
      ctx.fillRect(-10, -2, 8.5, 11);
      ctx.strokeRect(-10, -2, 8.5, 11);
      ctx.fillRect(1.5, -2, 8.5, 11);
      ctx.strokeRect(1.5, -2, 8.5, 11);
      ctx.restore();
    }

    const specX = pose.specularShift * 14;
    const gorgetGrad = ctx.createLinearGradient(-22 + specX, -70, 22 + specX, -48);
    gorgetGrad.addColorStop(0, "#475569");
    gorgetGrad.addColorStop(0.48, "#f8fafc");
    gorgetGrad.addColorStop(1, "#1e293b");

    ctx.save();
    ctx.translate(0, -68 - breath * 0.5);
    ctx.beginPath();
    ctx.moveTo(-22, -2);
    ctx.quadraticCurveTo(0, 10, 22, -2);
    ctx.lineTo(18, 16);
    ctx.quadraticCurveTo(0, 24, -18, 16);
    ctx.closePath();
    ctx.fillStyle = gorgetGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Brass rivets along gorget rim
    ctx.fillStyle = "#facc15";
    for (const gx of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.arc(gx, 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the head, expressive 17th-century face/beard, and headgear strictly ON TOP
 * of the forehead with chiaroscuro brow shadow and layered fluttering ostrich plume!
 */
function drawHeadAndHeadgear(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
) {
  ctx.save();
  ctx.translate(0, -78 - pose.chestLift * 0.55);
  ctx.rotate(pose.headAngle);

  // 0. Grand Prior Golden Command Aura behind Marshal Colloredo's head
  if (profile.id === "colloredo_marshal") {
    ctx.save();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 4.5]);
    ctx.beginPath();
    ctx.arc(0, -18, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 1. Hair locks framing neck & cheeks (extra flowing silver curls for Marshal Colloredo)
  ctx.fillStyle = profile.hairColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.8;
  if (profile.beard === "silver_marshal") {
    ctx.beginPath();
    ctx.moveTo(-22, -22);
    ctx.quadraticCurveTo(-30, -4, -22, 9);
    ctx.lineTo(22, 9);
    ctx.quadraticCurveTo(30, -4, 22, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-2, -10, 23, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 2. Expressive face oval with warm chiaroscuro modeling
  const faceGrad = ctx.createLinearGradient(-16, -28, 18, 6);
  faceGrad.addColorStop(0, "#f5d3b3");
  faceGrad.addColorStop(0.45, profile.skinTone);
  faceGrad.addColorStop(1, "#b8845e");
  ctx.beginPath();
  ctx.ellipse(1, -14, 18.5, 19.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.0;
  ctx.stroke();

  // Chiaroscuro brow shadow cast by hat/helmet brim across upper forehead
  ctx.fillStyle = "rgba(14, 12, 16, 0.54)";
  ctx.beginPath();
  ctx.ellipse(1, -22, 17.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (subtly shifting with idle look-around `headLookX`)
  const lx = pose.headLookX;
  ctx.fillStyle = "#18181b";
  if (profile.beard === "eyepatch") {
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.lineTo(18, -11);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-4 + lx * 0.3, -15, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(9 + lx * 0.4, -15, 2.7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-4.5 + lx * 0.45, -15, 2.5, 0, Math.PI * 2);
    ctx.arc(9 + lx * 0.45, -15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(92, 56, 36, 0.45)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(3 + lx * 0.3, -15);
    ctx.lineTo(4.5 + lx * 0.3, -9.5);
    ctx.stroke();
  }

  // 17th-century mustache & beard styles
  ctx.fillStyle = profile.hairColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  if (profile.beard === "silver_marshal") {
    // Distinguished silver-white Grand Marshal mustache & pointed Wallenstein/imperial Van Dyke goatee
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-13, -5);
    ctx.quadraticCurveTo(2, -11, 16, -5);
    ctx.quadraticCurveTo(8, -0.5, 2, -4);
    ctx.quadraticCurveTo(-4, -0.5, -13, -5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.5, -1);
    ctx.lineTo(6.5, -1);
    ctx.lineTo(2, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (profile.beard === "full_nordic") {
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.quadraticCurveTo(2, -10, 14, -5);
    ctx.lineTo(3, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (profile.beard === "mustache_goatee") {
    ctx.beginPath();
    ctx.moveTo(-11, -5);
    ctx.quadraticCurveTo(2, -10.5, 15, -5);
    ctx.quadraticCurveTo(7.5, -1, 2, -4);
    ctx.quadraticCurveTo(-3.5, -1, -11, -5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1.5, -1);
    ctx.lineTo(5.5, -1);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();
  } else if (profile.beard === "clean_youth") {
    // Young Clementinum university student — clean-shaven face with determined mouth
    ctx.strokeStyle = "#5c341d";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-3.5, -4.5);
    ctx.quadraticCurveTo(2, -6.5, 7.5, -4.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(42, 32, 24, 0.28)";
    ctx.beginPath();
    ctx.ellipse(2, -2, 12, 6.5, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#3b2314";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.quadraticCurveTo(2, -7.5, 9, -5);
    ctx.stroke();
  }

  // White paper cartridge gripped in teeth during M1624 reload first phase!
  if (
    pose.state === "reload" &&
    profile.usesPaperCartridges &&
    pose.reloadCycle < 0.48
  ) {
    ctx.save();
    ctx.translate(9, -5);
    ctx.rotate(0.28);
    ctx.fillStyle = "#faf6ec";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.fillRect(0, -2.6, 13, 5.2);
    ctx.strokeRect(0, -2.6, 13, 5.2);
    ctx.restore();
  }

  // 3. Headgear rendered strictly ON TOP of the upper forehead (Pillar 3)
  const specX = pose.specularShift * 14;

  if (profile.headgear === "nightcap") {
    // Field Marshal Colloredo's crimson velvet sleeping cap (`noční čapka`) with gold trim & silver hair curls!
    const capGrad = ctx.createLinearGradient(-20, -48, 20, -18);
    capGrad.addColorStop(0, "#dc2626");
    capGrad.addColorStop(0.55, profile.hatColor);
    capGrad.addColorStop(1, profile.hatShadow);

    // Softly drooping velvet nightcap crown with golden tassel
    ctx.beginPath();
    ctx.moveTo(-21, -21);
    ctx.quadraticCurveTo(-22, -48, 0, -48);
    ctx.quadraticCurveTo(18, -48, 21, -21);
    ctx.closePath();
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Silver-white aristocratic hair curls framing his temples beneath the nightcap brim
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(-18, -16, 6.5, 0, Math.PI * 2);
    ctx.arc(19, -16, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden embroidered headband sitting low over the brow
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-22, -26, 44, 6.5, 3);
    ctx.fill();
    ctx.stroke();

    // Gold tassel at top of nightcap
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-3, -48, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (profile.headgear === "jesuit_biretta") {
    // Father Jiří Plachý's 4-ridged square black Jesuit biretta (`jezuitský biret`) pulled low over brow
    const birettaGrad = ctx.createLinearGradient(-22, -48, 22, -21);
    birettaGrad.addColorStop(0, "#3f434d");
    birettaGrad.addColorStop(0.55, profile.hatColor);
    birettaGrad.addColorStop(1, "#09090b");
    ctx.beginPath();
    ctx.moveTo(-24, -21);
    ctx.lineTo(-17, -48);
    ctx.lineTo(0, -43);
    ctx.lineTo(17, -48);
    ctx.lineTo(24, -21);
    ctx.closePath();
    ctx.fillStyle = birettaGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Highlighted 4-ridge crest seams & black tuft pompon at top
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-17, -48);
    ctx.lineTo(0, -22);
    ctx.lineTo(17, -48);
    ctx.stroke();

    ctx.fillStyle = "#3f3f46";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-6, -54, 12, 8, 3);
    ctx.fill();
    ctx.stroke();

    // Snug black brow band
    ctx.fillStyle = "#09090b";
    ctx.fillRect(-24, -25, 48, 5.5);
    ctx.strokeRect(-24, -25, 48, 5.5);
  } else if (profile.headgear === "burgher_hat") {
    // Old Town Prague burgher / guild felt hat (Havel Řezáč & Ondřej Štěrba)
    const hatGrad = ctx.createLinearGradient(-20, -48, 20, -20);
    hatGrad.addColorStop(0, profile.hatColor);
    hatGrad.addColorStop(1, profile.hatShadow);

    ctx.beginPath();
    ctx.moveTo(-21, -21);
    ctx.quadraticCurveTo(-19, -48, 0, -47);
    ctx.quadraticCurveTo(19, -48, 21, -21);
    ctx.closePath();
    ctx.fillStyle = hatGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.fillStyle = profile.ribbonColor;
    ctx.fillRect(-20, -27, 40, 5.5);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-20, -27, 40, 5.5);

    // Wide sturdy burgher brim pulled low over forehead
    ctx.beginPath();
    ctx.moveTo(-42, -21);
    ctx.quadraticCurveTo(0, -28, 42, -21);
    ctx.quadraticCurveTo(28, -14, -42, -21);
    ctx.closePath();
    ctx.fillStyle = profile.hatShadow;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();
  } else if (profile.headgear === "student_hat") {
    // Clementinum Student Legion hat with golden university band & Bohemian red-white cockade/plume
    ctx.beginPath();
    ctx.moveTo(-21, -22);
    ctx.quadraticCurveTo(-19, -50, 0, -49);
    ctx.quadraticCurveTo(19, -50, 21, -22);
    ctx.closePath();
    ctx.fillStyle = profile.hatColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Gold university hatband
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-20, -28, 40, 6);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-20, -28, 40, 6);

    // Wide scholar brim
    ctx.beginPath();
    ctx.moveTo(-44, -23);
    ctx.quadraticCurveTo(0, -17, 44, -20);
    ctx.quadraticCurveTo(18, -28, -44, -23);
    ctx.closePath();
    ctx.fillStyle = profile.hatShadow;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    if (profile.plumePrimary) {
      drawJointedPlume(ctx, -16, -26, profile.plumePrimary, profile.plumeSecondary, pose.plumeSwing);
    }

    // Bohemian Red-White student badge cockade
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(-15, -25, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-15, -25, 2.0, 0, Math.PI * 2);
    ctx.fill();
  } else if (profile.headgear === "slokhatt") {
    const hatGrad = ctx.createLinearGradient(-22, -52, 22, -21);
    hatGrad.addColorStop(0, "#463a31");
    hatGrad.addColorStop(0.55, profile.hatColor);
    hatGrad.addColorStop(1, profile.hatShadow);
    ctx.beginPath();
    ctx.moveTo(-22, -22);
    ctx.quadraticCurveTo(-20, -52, 0, -51);
    ctx.quadraticCurveTo(20, -52, 22, -22);
    ctx.closePath();
    ctx.fillStyle = hatGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.fillStyle = profile.ribbonColor;
    ctx.fillRect(-21, -28, 42, 6.2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-21, -28, 42, 6.2);

    ctx.beginPath();
    ctx.moveTo(-50, -30);
    ctx.quadraticCurveTo(-26, -15, 0, -20);
    ctx.quadraticCurveTo(32, -23, 52, -14);
    ctx.quadraticCurveTo(24, -29, 0, -28);
    ctx.quadraticCurveTo(-26, -27, -50, -30);
    ctx.closePath();
    ctx.fillStyle = profile.hatShadow;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    if (profile.plumePrimary) {
      drawJointedPlume(ctx, -18, -28, profile.plumePrimary, profile.plumeSecondary, pose.plumeSwing);
    }

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(-18, -26, 4.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else if (profile.headgear === "zischagge") {
    ctx.fillStyle = "#1e242e";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-18, -21);
    ctx.lineTo(-36, -1);
    ctx.lineTo(-16, 2);
    ctx.lineTo(-11, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-19 - i * 4.5, -14 + i * 5.2);
      ctx.lineTo(-13 - i * 2.2, -11 + i * 4.2);
      ctx.stroke();
    }

    if (profile.plumePrimary) {
      drawJointedPlume(ctx, -14, -40, profile.plumePrimary, profile.plumeSecondary, pose.plumeSwing);
    }

    const helmGrad = ctx.createLinearGradient(-24 + specX, -52, 24 + specX, -19);
    helmGrad.addColorStop(0, "#151a22");
    helmGrad.addColorStop(0.38, "#475569");
    helmGrad.addColorStop(0.5, "#f8fafc");
    helmGrad.addColorStop(0.65, "#334155");
    helmGrad.addColorStop(1, "#0b0f16");

    ctx.beginPath();
    ctx.arc(0, -22, 23.5, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = helmGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-23, -22);
    ctx.quadraticCurveTo(5, -29, 34, -18);
    ctx.quadraticCurveTo(9, -17, -23, -22);
    ctx.closePath();
    ctx.fillStyle = "#475569";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, -21);
    ctx.lineTo(-21, -2);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-9, -21);
    ctx.closePath();
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(7, -25);
    ctx.lineTo(7, -6);
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, -46, 4.0, 0, Math.PI * 2);
    ctx.fill();
    drawMetalScratches(ctx, 0, -32, 30, 18, profile.scratchSeed + 5, 4);
  } else if (profile.headgear === "morion") {
    if (profile.plumePrimary) {
      drawJointedPlume(ctx, -16, -38, profile.plumePrimary, profile.plumeSecondary, pose.plumeSwing);
    }

    const morionGrad = ctx.createLinearGradient(-26 + specX, -60, 26 + specX, -19);
    morionGrad.addColorStop(0, "#141820");
    morionGrad.addColorStop(0.38, "#475569");
    morionGrad.addColorStop(0.5, "#f8fafc");
    morionGrad.addColorStop(0.66, "#334155");
    morionGrad.addColorStop(1, "#0b0e14");

    ctx.beginPath();
    ctx.moveTo(-16, -36);
    ctx.quadraticCurveTo(0, -68, 16, -36);
    ctx.closePath();
    ctx.fillStyle = morionGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -22, 22.5, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = morionGrad;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-39, -31);
    ctx.quadraticCurveTo(0, -11, 39, -31);
    ctx.quadraticCurveTo(0, -23, -39, -31);
    ctx.closePath();
    ctx.fillStyle = "#475569";
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    for (let rx = -17; rx <= 17; rx += 6.8) {
      ctx.beginPath();
      ctx.arc(rx, -23, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    drawMetalScratches(ctx, 0, -34, 28, 20, profile.scratchSeed + 9, 4);
  } else if (profile.headgear === "karpus") {
    const capGrad = ctx.createLinearGradient(-20, -50, 20, -17);
    capGrad.addColorStop(0, profile.hatColor);
    capGrad.addColorStop(1, profile.hatShadow);

    ctx.beginPath();
    ctx.moveTo(-22, -21);
    ctx.quadraticCurveTo(-26, -50, 2, -50);
    ctx.quadraticCurveTo(24, -48, 23, -21);
    ctx.closePath();
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-24, -24);
    ctx.lineTo(25, -24);
    ctx.lineTo(24, -13);
    ctx.lineTo(15, -16);
    ctx.lineTo(-13, -16);
    ctx.lineTo(-24, -3);
    ctx.lineTo(-28, -14);
    ctx.closePath();
    ctx.fillStyle = "#4b3c30";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = profile.ribbonColor;
    ctx.beginPath();
    ctx.arc(11, -21, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (profile.headgear === "constable_cap") {
    ctx.beginPath();
    ctx.moveTo(-21, -22);
    ctx.quadraticCurveTo(-20, -48, 0, -47);
    ctx.quadraticCurveTo(20, -48, 21, -22);
    ctx.closePath();
    ctx.fillStyle = profile.hatColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.fillStyle = profile.ribbonColor;
    ctx.fillRect(-21, -27, 42, 5.2);
    ctx.beginPath();
    ctx.ellipse(0, -22, 35, 6.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = profile.hatShadow;
    ctx.fill();
    ctx.stroke();
  } else if (profile.headgear === "hood") {
    ctx.beginPath();
    ctx.moveTo(-24, -12);
    ctx.quadraticCurveTo(-27, -52, 0, -52);
    ctx.quadraticCurveTo(27, -52, 24, -12);
    ctx.quadraticCurveTo(0, -27, -24, -12);
    ctx.closePath();
    ctx.fillStyle = profile.hatColor;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  } else if (profile.headgear === "mitre") {
    ctx.beginPath();
    ctx.moveTo(-23, -22);
    ctx.lineTo(0, -68);
    ctx.lineTo(23, -22);
    ctx.closePath();
    ctx.fillStyle = "#1e3a8a";
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3.4;
    ctx.stroke();

    const plateGrad = ctx.createLinearGradient(-14 + specX, -56, 14 + specX, -23);
    plateGrad.addColorStop(0, "#a16207");
    plateGrad.addColorStop(0.5, "#fef08a");
    plateGrad.addColorStop(1, "#854d0e");
    ctx.beginPath();
    ctx.moveTo(-14, -23);
    ctx.lineTo(0, -56);
    ctx.lineTo(14, -23);
    ctx.closePath();
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.fillStyle = plateGrad;
    ctx.fillRect(-25, -27, 50, 8.5);
    ctx.strokeRect(-25, -27, 50, 8.5);
  }

  ctx.restore();
}

/** Layered jointed fluttering ostrich plume pivoting dynamically from its base quill */
function drawJointedPlume(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  primary: string,
  secondary: string | null,
  plumeSwing: number,
) {
  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate(plumeSwing);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-16, -30, -48, -28, -54, -2);
  ctx.bezierCurveTo(-38, -11, -20, -7, 0, 2);
  ctx.closePath();
  ctx.fillStyle = primary;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, -1);
  ctx.quadraticCurveTo(-24, -18, -46, -6);
  ctx.stroke();

  if (secondary) {
    ctx.rotate(plumeSwing * 0.35);
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.bezierCurveTo(-10, -36, -36, -38, -45, -15);
    ctx.bezierCurveTo(-30, -20, -16, -13, 2, -1);
    ctx.closePath();
    ctx.fillStyle = secondary;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.3;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the planted or carried wooden Furketa (heavy musket fork rest with iron ground-spike & brass U-fork).
 * Rendered ONLY for units using an older heavy matchlock (`pose.hasFurketa === true`, e.g. Brother Bartoloměj
 * and the Belvedere heavy marksman).
 */
function drawFurketa(
  ctx: CanvasRenderingContext2D,
  forkX: number,
  forkY: number,
  groundY: number,
  plantWeight: number,
  tiltAngle: number,
) {
  ctx.save();
  const baseBottomX = forkX + Math.sin(tiltAngle) * (groundY - forkY) * (1 - plantWeight * 0.88);
  const topY = forkY;
  const bottomY = groundY;

  ctx.strokeStyle = "#6e441f";
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(forkX, topY + 6);
  ctx.lineTo(baseBottomX, bottomY - 9);
  ctx.stroke();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(baseBottomX - 3, bottomY - 11);
  ctx.lineTo(baseBottomX + 3, bottomY - 11);
  ctx.lineTo(baseBottomX, bottomY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(forkX - 8, topY - 4);
  ctx.quadraticCurveTo(forkX, topY + 10, forkX + 8, topY - 4);
  ctx.stroke();
  ctx.restore();
}

interface WeaponAnchors {
  backHand: Vec2;
  frontHand: Vec2;
  panPos: Vec2;
  muzzlePos: Vec2;
  barrelAngle: number;
}

/** Helper to draw an ornate 1648 wheellock pistol (`kolečková pistole`) at (wx, wy, ang). */
function drawWheellockPistol(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  ang: number,
  isSilverInlaid = false,
) {
  ctx.save();
  ctx.translate(wx + 10, wy + 2);
  ctx.rotate(ang);

  // Walnut pistol stock & pommel
  ctx.fillStyle = isSilverInlaid ? "#4a2711" : "#5c3419";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-14, 7);
  ctx.lineTo(-4, -3);
  ctx.lineTo(44, -3);
  ctx.lineTo(44, 4);
  ctx.lineTo(4, 5);
  ctx.lineTo(-7, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden / silver pommel cap
  ctx.fillStyle = isSilverInlaid ? "#facc15" : "#cbd5e1";
  ctx.beginPath();
  ctx.arc(-11, 10, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Steel barrel
  ctx.fillStyle = isSilverInlaid ? "#f8fafc" : "#cbd5e1";
  ctx.fillRect(4, -7.2, 46, 5.8);
  ctx.strokeRect(4, -7.2, 46, 5.8);

  // Brass wheellock mechanism disk
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(14, -1.5, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the primary 1648 Prague Defender or Swedish weapon and returns exact torso-local grip points
 * for the back hand, front hand, pan flash origin, and muzzle blast origin.
 */
function drawPrimaryWeapon(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
  groundLocalY: number,
): WeaponAnchors {
  const wx = pose.weaponX;
  const wy = pose.weaponY;
  const ang = pose.weaponAngle;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);

  const toLocal = (lx: number, ly: number): Vec2 => ({
    x: wx + lx * cos - ly * sin,
    y: wy + lx * sin + ly * cos,
  });

  // 1. FIELD MARSHAL COLLOREDO: Carved Walking Cane planted in ground + Silver Wheellock Pistol!
  if (profile.primaryWeapon === "colloredo_cane_pistol") {
    const limpCycle = pose.state === "march" ? Math.sin(pose.stridePhase) : 0;
    const meleeSwing = pose.state === "melee" ? Math.sin(pose.torsoAngle * 3.2) : 0;
    const caneTopX = -35 + limpCycle * 4 + meleeSwing * 14;
    const caneTopY = -13 + Math.max(0, limpCycle) * 3 - Math.abs(meleeSwing) * 14;
    const caneBottomX = -40 + limpCycle * 10 + meleeSwing * 28;
    const caneBottomY = groundLocalY - 3 - Math.max(0, -limpCycle) * 5 - Math.abs(meleeSwing) * 12;

    ctx.save();
    // Carved walnut walking cane (`vycházková hůl`) supporting his Lützen-wounded leg
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 9.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(caneTopX, caneTopY);
    ctx.lineTo(caneBottomX, caneBottomY);
    ctx.stroke();

    ctx.strokeStyle = "#78441e";
    ctx.lineWidth = 5.6;
    ctx.beginPath();
    ctx.moveTo(caneTopX, caneTopY);
    ctx.lineTo(caneBottomX, caneBottomY);
    ctx.stroke();

    // Brass ferrule at bottom tip of cane
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(caneBottomX, caneBottomY - 10);
    ctx.lineTo(caneBottomX, caneBottomY);
    ctx.stroke();

    // Ornate golden Grand Prior knob handle at top of walking cane
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(caneTopX, caneTopY - 2, 9.2, 6.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(caneTopX - 2.5, caneTopY - 3.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Silver-inlaid wheellock bedroom pistol extended forward in shooting hand (+X side)
    const px = wx + 18;
    const py = wy - 4;
    const toPistol = (lx: number, ly: number): Vec2 => ({
      x: px + lx * cos - ly * sin,
      y: py + lx * sin + ly * cos,
    });
    drawWheellockPistol(ctx, px, py, ang, true);

    return {
      backHand: { x: caneTopX, y: caneTopY }, // Held by near/-X arm (`frontShoulder`)
      frontHand: toPistol(6, 5), // Held by forward/+X arm (`backShoulder`)
      panPos: toPistol(24, -3),
      muzzlePos: toPistol(62, -5),
      barrelAngle: ang,
    };
  }

  // 2. FATHER JIŘÍ PLACHÝ: Raised Gilded Crucifix in near hand + Wheellock Pistol extended forward!
  if (profile.primaryWeapon === "plachy_crucifix_pistol") {
    const crossX = -42;
    const crossY = -44 + Math.sin(pose.time * 2.8) * 2.2;
    ctx.save();
    ctx.translate(crossX, crossY);
    ctx.rotate(-0.14 + pose.torsoAngle * 0.3);

    // Radiant golden halo around crucifix
    const glow = ctx.createRadialGradient(0, -16, 3, 0, -16, 32);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.58)");
    glow.addColorStop(0.6, "rgba(250, 204, 21, 0.2)");
    glow.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -16, 32, 0, Math.PI * 2);
    ctx.fill();

    // Vertical & horizontal gilded cross beams
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 9.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -42);
    ctx.moveTo(-18, -24);
    ctx.lineTo(18, -24);
    ctx.stroke();

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 5.8;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -42);
    ctx.moveTo(-18, -24);
    ctx.lineTo(18, -24);
    ctx.stroke();

    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, -24, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const px = wx + 18;
    const py = wy - 4;
    const toPistol = (lx: number, ly: number): Vec2 => ({
      x: px + lx * cos - ly * sin,
      y: py + lx * sin + ly * cos,
    });
    drawWheellockPistol(ctx, px, py, ang, false);

    return {
      backHand: { x: crossX, y: crossY + 6 }, // Held by near/-X arm (`frontShoulder`)
      frontHand: toPistol(6, 5), // Held by forward/+X arm (`backShoulder`)
      panPos: toPistol(24, -3),
      muzzlePos: toPistol(62, -5),
      barrelAngle: ang,
    };
  }

  // 3. HAVEL ŘEZÁČ (Old Town Butcher): Heavy Steel Butcher's Cleaver (`Řeznický sekáč`) + Wheellock Pistol!
  if (profile.primaryWeapon === "havel_cleaver_pistol") {
    const chop = pose.state === "melee" ? Math.sin(pose.torsoAngle * 3.8) : 0;
    const cleaverX = -40 + chop * 16;
    const cleaverY = -22 - chop * 14;
    ctx.save();
    ctx.translate(cleaverX, cleaverY);
    ctx.rotate(-0.35 + Math.sin(pose.time * 3.0) * 0.05 + chop * 1.15);

    // Hardwood cleaver handle
    ctx.fillStyle = "#451a03";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(-4.5, -4, 9, 24, 3);
    ctx.fill();
    ctx.stroke();

    // Broad rectangular steel butcher's cleaver blade with hanging hole & blood stain
    const bladeGrad = ctx.createLinearGradient(-16, -46, 12, -4);
    bladeGrad.addColorStop(0, "#f8fafc");
    bladeGrad.addColorStop(0.6, "#cbd5e1");
    bladeGrad.addColorStop(1, "#64748b");
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-20, -46);
    ctx.lineTo(5, -44);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hanging hole near top corner of cleaver
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(-13, -39, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const px = wx + 18;
    const py = wy - 4;
    const toPistol = (lx: number, ly: number): Vec2 => ({
      x: px + lx * cos - ly * sin,
      y: py + lx * sin + ly * cos,
    });
    drawWheellockPistol(ctx, px, py, ang, false);

    return {
      backHand: { x: cleaverX, y: cleaverY + 8 },
      frontHand: toPistol(6, 5),
      panPos: toPistol(24, -3),
      muzzlePos: toPistol(62, -5),
      barrelAngle: ang,
    };
  }

  // 4. ONDŘEJ ŠTĚRBA & CLEMENTINUM STUDENT: Rope Knife / Scholar Rapier + Wheellock Pistol
  if (
    profile.primaryWeapon === "ondrej_knife_pistol" ||
    profile.primaryWeapon === "student_pistol" ||
    profile.primaryWeapon === "harrier_blade"
  ) {
    const px = wx + 18;
    const py = wy - 4;
    const toPistol = (lx: number, ly: number): Vec2 => ({
      x: px + lx * cos - ly * sin,
      y: py + lx * sin + ly * cos,
    });
    drawWheellockPistol(ctx, px, py, ang, false);

    const slash = pose.state === "melee" ? Math.sin(pose.torsoAngle * 3.8) : 0;
    const bladeX = -38 + slash * 18;
    const bladeY = -18 - slash * 10;

    if (profile.primaryWeapon !== "student_pistol") {
      // Off-hand rope dagger / boarding blade
      ctx.save();
      ctx.translate(bladeX, bladeY);
      ctx.rotate(-0.45 + Math.sin(pose.time * 3.2) * 0.06 + slash * 1.1);
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, -46);
      ctx.lineTo(0, -55);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    return {
      backHand:
        profile.primaryWeapon === "student_pistol"
          ? { x: -29, y: -6 } // resting near hand on rapier hilt at left hip
          : { x: bladeX + 2, y: bladeY + 4 },
      frontHand: toPistol(6, 5),
      panPos: toPistol(24, -3),
      muzzlePos: toPistol(62, -5),
      barrelAngle: ang,
    };
  }

  // 5. ARTILLERY CONSTABLE: Wooden Rammer/Swab + Glowing Luntstock
  if (profile.primaryWeapon === "constable_luntstock") {
    ctx.save();
    ctx.strokeStyle = "#7c4a21";
    ctx.lineWidth = 6.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-48, 44);
    ctx.lineTo(-18, -126);
    ctx.stroke();
    ctx.fillStyle = "#b8a78d";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(-27, -146, 18, 26, 8);
    ctx.fill();
    ctx.stroke();

    ctx.translate(wx, wy);
    ctx.rotate(ang - 0.52);
    ctx.strokeStyle = "#5c3415";
    ctx.lineWidth = 5.6;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(68, 0);
    ctx.stroke();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(66, -6.5);
    ctx.lineTo(77, 0);
    ctx.lineTo(66, 6.5);
    ctx.stroke();
    const coalPulse = 5.0 + Math.sin(pose.time * 12) * 1.4;
    const glow = ctx.createRadialGradient(77, -2, 1, 77, -2, coalPulse * 2.4);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.95)");
    glow.addColorStop(0.45, "rgba(249, 115, 22, 0.72)");
    glow.addColorStop(1, "rgba(249, 115, 22, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(77, -2, coalPulse * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(77, -2, coalPulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const luntAng = ang - 0.52;
    const lc = Math.cos(luntAng);
    const ls = Math.sin(luntAng);
    return {
      backHand: { x: -32, y: -28 },
      frontHand: { x: wx + 8 * lc, y: wy + 8 * ls },
      panPos: { x: wx + 74 * lc, y: wy + 74 * ls },
      muzzlePos: { x: wx + 79 * lc, y: wy + 79 * ls },
      barrelAngle: luntAng,
    };
  }

  if (profile.primaryWeapon === "occultist_censer") {
    ctx.save();
    const censerX = -44;
    const censerY = -60 + Math.sin(pose.time * 3.4) * 3;
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(censerX, censerY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(censerX, censerY - 13, 6.5 + Math.sin(pose.time * 10) * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(censerX, censerY - 13, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Towering 5m ash Pike with steel spearhead & fluttering blue-gold pennant (`pike_and_musket`)
  if (profile.primaryWeapon === "pike_and_musket") {
    ctx.save();
    const pikeTilt = -0.06 + pose.torsoAngle * 0.25;
    ctx.translate(-39, 6);
    ctx.rotate(pikeTilt);
    ctx.strokeStyle = "#78491f";
    ctx.lineWidth = 6.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 76);
    ctx.lineTo(0, -172);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const pf = pose.plumeSwing * 14 + Math.sin(pose.time * 6.2) * 4;
    ctx.beginPath();
    ctx.moveTo(3, -152);
    ctx.lineTo(46, -144 + pf * 0.5);
    ctx.lineTo(30, -133 + pf * 0.4);
    ctx.lineTo(48, -123 + pf * 0.7);
    ctx.lineTo(3, -127);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.moveTo(3, -145);
    ctx.lineTo(34, -139 + pf * 0.4);
    ctx.lineTo(3, -133);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -196);
    ctx.lineTo(-10, -166);
    ctx.lineTo(0, -171);
    ctx.lineTo(10, -166);
    ctx.closePath();
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  // Long-arm firearms:
  // 1. Wheellock Dragoon Carbine (`officer_carbine` — Jan Matěj & Odowalsky): compact 74px barrel, brass wheellock disk
  // 2. Modernized M1624 Lightened Musket (`light_musket` — Václav z Michalovic & Swedish Brigades, NO furketa): 88px barrel
  // 3. Older Heavy Matchlock WITH Furketa (`heavy_musket_furketa` — Bratr Bartoloměj & Belvedere veteran): 108px barrel + wooden furketa
  const isCarbine =
    profile.primaryWeapon === "officer_carbine" ||
    profile.primaryWeapon === "occultist_censer";
  const isHeavyFurketa = pose.hasFurketa && !isCarbine;
  const barrelLen = isCarbine ? 74 : isHeavyFurketa ? 108 : 88;
  const barrelThick = isHeavyFurketa ? 7.2 : 5.8;
  const stockBack = isCarbine ? -32 : isHeavyFurketa ? -42 : -36;

  if (isHeavyFurketa) {
    const cradlePos = toLocal(46, 3.5);
    drawFurketa(ctx, cradlePos.x, cradlePos.y, groundLocalY, pose.furketaPlant, pose.furketaAngle);
  }

  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(ang);

  const stockGrad = ctx.createLinearGradient(stockBack, -2, barrelLen - 16, 12);
  stockGrad.addColorStop(0, "#704220");
  stockGrad.addColorStop(0.55, "#593317");
  stockGrad.addColorStop(1, "#3b200d");

  ctx.beginPath();
  ctx.moveTo(stockBack, -2);
  ctx.lineTo(stockBack - 4, isHeavyFurketa ? 16 : 13.5);
  ctx.lineTo(-10, 6.5);
  ctx.lineTo(barrelLen - 16, 4.8);
  ctx.lineTo(barrelLen - 16, -2);
  ctx.closePath();
  ctx.fillStyle = stockGrad;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-4, 7.5, 4.5, 0, Math.PI);
  ctx.stroke();

  const barGrad = ctx.createLinearGradient(0, -barrelThick - 1, barrelLen, 0);
  barGrad.addColorStop(0, "#475569");
  barGrad.addColorStop(
    Math.max(0.15, Math.min(0.85, 0.5 + pose.specularShift * 0.25)),
    "#f8fafc",
  );
  barGrad.addColorStop(1, "#334155");
  ctx.fillStyle = barGrad;
  ctx.fillRect(-12, -barrelThick - 1.2, barrelLen + 12, barrelThick);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-12, -barrelThick - 1.2, barrelLen + 12, barrelThick);

  ctx.fillStyle = "#facc15";
  ctx.fillRect(22, -barrelThick - 1.5, 4.4, barrelThick + 6.5);
  ctx.fillRect(barrelLen - 28, -barrelThick - 1.5, 4.4, barrelThick + 5.8);

  if (pose.state === "reload" && pose.reloadCycle >= 0.48) {
    const stroke = Math.sin(((pose.reloadCycle - 0.48) / 0.52) * Math.PI * 2);
    const ramOut = 16 + stroke * 12;
    ctx.strokeStyle = "#b07d44";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(barrelLen - 6, -barrelThick * 0.6);
    ctx.lineTo(barrelLen + ramOut, -barrelThick * 0.6);
    ctx.stroke();
  }

  if (isCarbine) {
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(8, 0, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = "#facc15";
    ctx.fillRect(10, -5.5, 7.5, 4.4);
    const dip = pose.fireSample.matchDip;
    const cockAngle = -0.55 + dip * 0.72;
    ctx.save();
    ctx.translate(4, 1);
    ctx.rotate(cockAngle);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10.5, -10.5);
    ctx.stroke();
    const coalR = 3.4 + Math.sin(pose.time * 14) * 0.8 + dip * 1.6;
    ctx.fillStyle = "rgba(249, 115, 22, 0.38)";
    ctx.beginPath();
    ctx.arc(11.5, -11.5, coalR * 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(11.5, -11.5, coalR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(11.5, -11.5, coalR * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  const backHandGrip: Vec2 =
    profile.primaryWeapon === "occultist_censer"
      ? { x: -44, y: -50 }
      : pose.state === "reload" && profile.usesPaperCartridges
        ? pose.reloadCycle < 0.48
          ? { x: 14, y: -76 }
          : toLocal(barrelLen + 6, -4)
        : toLocal(isHeavyFurketa ? 38 : 34, 4.5);

  return {
    backHand: backHandGrip,
    frontHand: toLocal(-8, 5.5),
    panPos: toLocal(14, -6),
    muzzlePos: toLocal(barrelLen + 2, -4),
    barrelAngle: ang,
  };
}

/**
 * Draws the synchronized 17th-century black-powder firing VFX right on the 2D sprite canvas:
 * 1. Priming Pan Flash
 * 2. Main Muzzle Blast (+0.10s later)
 * 3. Billowing Dense White Black-Powder Smoke Cloud
 */
function drawBlackPowderVFX(
  ctx: CanvasRenderingContext2D,
  anchors: WeaponAnchors,
  pose: SwedishRigPose,
) {
  const fs = pose.fireSample;
  if (fs.panFlash <= 0.01 && fs.muzzleFlash <= 0.01 && fs.smokeAlpha <= 0.01) {
    return;
  }

  ctx.save();

  if (fs.smokeAlpha > 0.01) {
    const p = fs.smokeProgress;
    const isMisfire = pose.state === "misfire";
    const origin = isMisfire ? anchors.panPos : anchors.muzzlePos;
    const cos = Math.cos(anchors.barrelAngle);
    const sin = Math.sin(anchors.barrelAngle);

    const puffCount = isMisfire ? 4 : 7;
    for (let i = 0; i < puffCount; i++) {
      const frac = i / Math.max(1, puffCount - 1);
      const drift = (14 + frac * 54) * (0.25 + p * 0.95);
      const rise = -(8 + frac * 34) * p - Math.sin(frac * Math.PI) * 10 * p;
      const sx = origin.x + cos * drift * (isMisfire ? 0.35 : 1) + (i % 2 === 0 ? -4 : 5) * p;
      const sy = origin.y + sin * drift * (isMisfire ? 0.35 : 1) + rise;
      const radius = (isMisfire ? 7 : 12) + (12 + frac * 19) * Math.pow(p, 0.72);
      const alpha = fs.smokeAlpha * (1 - frac * 0.32);

      const smokeGrad = ctx.createRadialGradient(
        sx - radius * 0.25,
        sy - radius * 0.25,
        radius * 0.12,
        sx,
        sy,
        radius,
      );
      smokeGrad.addColorStop(0, `rgba(248, 250, 252, ${alpha})`);
      smokeGrad.addColorStop(0.58, `rgba(218, 222, 228, ${alpha * 0.82})`);
      smokeGrad.addColorStop(1, "rgba(148, 163, 184, 0)");
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (fs.panFlash > 0.02) {
    const f = fs.panFlash;
    const { x, y } = anchors.panPos;
    const r = 13 + f * 17;
    const panGrad = ctx.createRadialGradient(x, y, 1, x, y, r);
    panGrad.addColorStop(0, `rgba(255, 255, 240, ${f})`);
    panGrad.addColorStop(0.45, `rgba(251, 146, 60, ${f * 0.9})`);
    panGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
    ctx.fillStyle = panGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(254, 240, 138, ${f})`;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.85 + i * 0.38;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (10 + f * 19), y + Math.sin(a) * (10 + f * 19));
      ctx.stroke();
    }
  }

  if (fs.muzzleFlash > 0.02) {
    const mf = fs.muzzleFlash;
    ctx.save();
    ctx.translate(anchors.muzzlePos.x, anchors.muzzlePos.y);
    ctx.rotate(anchors.barrelAngle);

    const coneLen = 30 + mf * 48;
    const coneW = 11 + mf * 17;
    const blastGrad = ctx.createLinearGradient(0, 0, coneLen, 0);
    blastGrad.addColorStop(0, `rgba(255, 255, 255, ${mf})`);
    blastGrad.addColorStop(0.35, `rgba(254, 240, 138, ${mf * 0.96})`);
    blastGrad.addColorStop(0.75, `rgba(249, 115, 22, ${mf * 0.82})`);
    blastGrad.addColorStop(1, "rgba(220, 38, 38, 0)");

    ctx.fillStyle = blastGrad;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(coneLen * 0.45, -coneW);
    ctx.lineTo(coneLen, 0);
    ctx.lineTo(coneLen * 0.45, coneW);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${mf})`;
    ctx.beginPath();
    ctx.ellipse(coneLen * 0.22, 0, coneLen * 0.26, coneW * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders one complete frame of a 1648 Prague Defender or Swedish soldier onto the given 2D Canvas context
 * (`SWEDISH_CANVAS_W × SWEDISH_CANVAS_H`).
 * `facingSign`: `+1` aims/faces screen-right, `-1` mirrors cleanly to aim/face screen-left.
 */
export function drawSwedishSoldier2D(
  ctx: CanvasRenderingContext2D,
  profile: SwedishTroopProfile,
  pose: SwedishRigPose,
  facingSign: 1 | -1 = 1,
): void {
  ctx.clearRect(0, 0, SWEDISH_CANVAS_W, SWEDISH_CANVAS_H);

  const isTallCrest =
    profile.primaryWeapon === "pike_and_musket" || profile.hasBackBanner;
  const figScale = (isTallCrest ? 1.32 : 1.48) * (profile.heightScale || 1.0);

  const basePelvisX = 210 - facingSign * 18 + pose.rootX * figScale * facingSign;
  const basePelvisY = (isTallCrest ? 276 : 262) + pose.rootY * figScale;
  const groundY = 408;

  // Soft grounded baroque contact shadow directly beneath the soldier's boots/slippers
  ctx.save();
  ctx.fillStyle = "rgba(8, 7, 10, 0.36)";
  ctx.beginPath();
  ctx.ellipse(basePelvisX, groundY - 4, 46 * (figScale / 1.48), 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(basePelvisX, basePelvisY);
  ctx.scale(figScale * facingSign, figScale);

  if (pose.collapseWeight > 0.001) {
    ctx.rotate(pose.collapseWeight * 0.35);
  }

  // --- LAYER 1: Back Cloak (`Kapp` / `Plášť`) & Back Banner ---
  ctx.save();
  ctx.rotate(pose.torsoAngle);
  if (profile.hasBackBanner) {
    drawBackBanner(ctx, pose);
  }
  drawBackCloak(ctx, profile, pose);
  ctx.restore();

  // --- LAYER 2: Back Leg (darkened for 3D depth) ---
  drawLeg(ctx, -16, 8, pose.backHip, pose.backKnee, profile, true);

  // --- LAYER 3: Torso-Space Back IK Arm (for two-handed muskets/carbines reaching forestock on +X side) ---
  const backShoulder: Vec2 = { x: 24, y: -59 - pose.chestLift * 0.4 };
  const frontShoulder: Vec2 = { x: -24, y: -59 - pose.chestLift * 0.4 };

  const isDualHandedOffhand =
    profile.primaryWeapon === "colloredo_cane_pistol" ||
    profile.primaryWeapon === "plachy_crucifix_pistol" ||
    profile.primaryWeapon === "havel_cleaver_pistol" ||
    profile.primaryWeapon === "ondrej_knife_pistol" ||
    profile.primaryWeapon === "student_pistol" ||
    profile.primaryWeapon === "harrier_blade" ||
    profile.primaryWeapon === "constable_luntstock" ||
    profile.primaryWeapon === "occultist_censer";

  if (!isDualHandedOffhand) {
    ctx.save();
    ctx.rotate(pose.torsoAngle);

    const ang = pose.weaponAngle;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const isCarbine = profile.primaryWeapon === "officer_carbine";
    const isHeavyFurketa = pose.hasFurketa && !isCarbine;
    const barrelLen = isCarbine ? 74 : isHeavyFurketa ? 108 : 88;
    const gripDist = isHeavyFurketa ? 38 : 34;

    const preBackHand: Vec2 =
      pose.state === "reload" && profile.usesPaperCartridges
        ? pose.reloadCycle < 0.48
          ? { x: 14, y: -76 }
          : {
              x: pose.weaponX + (barrelLen + 6) * cos - -4 * sin,
              y: pose.weaponY + (barrelLen + 6) * sin + -4 * cos,
            }
        : {
            x: pose.weaponX + gripDist * cos - 4.5 * sin,
            y: pose.weaponY + gripDist * sin + 4.5 * cos,
          };

    const backArmIK = solveTwoBoneIK(backShoulder, preBackHand, 34, 32, 1);
    drawIKArm(ctx, backArmIK, profile, true);
    ctx.restore();
  }

  // --- LAYER 4: Front Leg ---
  drawLeg(ctx, 16, 8, pose.frontHip, pose.frontKnee, profile, false);

  // --- LAYER 5 & 6: Torso (Nightshirt / Jesuit Cassock / Kabátec / Kolet), Armor, Insignia, Collar ---
  ctx.save();
  ctx.rotate(pose.torsoAngle);

  drawTorsoAndArmor(ctx, profile, pose);
  drawChestEquipment(ctx, profile, pose);

  // --- LAYER 7: Head, Face, Beard & Headgear ON TOP of Forehead + Jointed Plume ---
  drawHeadAndHeadgear(ctx, profile, pose);

  // --- LAYER 8: Primary Weapon & Uncrossed 2-Bone IK Arms ---
  const groundLocalY = (groundY - basePelvisY) / figScale;
  const anchors = drawPrimaryWeapon(ctx, profile, pose, groundLocalY);

  if (isDualHandedOffhand) {
    // Forward/+X shoulder (`backShoulder`) holds the extended pistol / luntstock / carbine — zero torso crossing!
    const forwardShootIK = solveTwoBoneIK(backShoulder, anchors.frontHand, 34, 32, 1);
    drawIKArm(ctx, forwardShootIK, profile, false);

    // Near/-X shoulder (`frontShoulder`) holds the cane / crucifix / cleaver / dagger / rapier / rammer / censer
    const nearBendDir: 1 | -1 =
      profile.primaryWeapon === "plachy_crucifix_pistol" ||
      profile.primaryWeapon === "constable_luntstock" ||
      profile.primaryWeapon === "occultist_censer"
        ? -1
        : 1;
    const offhandIK = solveTwoBoneIK(frontShoulder, anchors.backHand, 34, 32, nearBendDir);
    drawIKArm(ctx, offhandIK, profile, false);
  } else {
    const frontArmIK = solveTwoBoneIK(frontShoulder, anchors.frontHand, 34, 32, 1);
    drawIKArm(ctx, frontArmIK, profile, false);
  }

  // --- LAYER 9: Synchronized Black-Powder VFX (Pan Flash -> +0.10s Muzzle Blast -> White Smoke) ---
  drawBlackPowderVFX(ctx, anchors, pose);

  ctx.restore();
  ctx.restore();

  if (pose.hitFlash > 0.04) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(239, 68, 68, ${pose.hitFlash * 0.48})`;
    ctx.fillRect(0, 0, SWEDISH_CANVAS_W, SWEDISH_CANVAS_H);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Matching Portrait Snapshot Cache (for UnitPortrait & InspectDossier HUD)
// ---------------------------------------------------------------------------

const PORTRAIT_DATA_URI_CACHE = new Map<string, string>();

/**
 * Renders a crisp 160x160 bust portrait directly from the 1648 2D skeletal
 * renderer so HUD portraits match the live animated battlefield figurines 1-to-1.
 */
export function getSwedishPortraitDataUri(profile: SwedishTroopProfile): string | null {
  const cached = PORTRAIT_DATA_URI_CACHE.get(profile.id);
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  try {
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = SWEDISH_CANVAS_W;
    fullCanvas.height = SWEDISH_CANVAS_H;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return null;

    const hasFurketa = resolveUsesFurketa(profile);
    const rig = createSwedishRigState(profile.scratchSeed, hasFurketa);
    rig.pose.plumeSwing = 0.08;
    rig.pose.specularShift = 0.22;
    drawSwedishSoldier2D(fullCtx, profile, rig.pose, 1);

    const portrait = document.createElement("canvas");
    portrait.width = 160;
    portrait.height = 160;
    const pCtx = portrait.getContext("2d");
    if (!pCtx) return null;

    // Tight, heroic Baroque bust crop framing face, headgear, collar/gorget/Maltese cross cleanly
    const isTall =
      profile.primaryWeapon === "pike_and_musket" ||
      profile.hasBackBanner ||
      profile.id === "plachy_jesuit";
    const cropSize = isTall ? 174 : 164;
    const cropX = Math.round(192 - cropSize * 0.5);
    const cropY = isTall ? 42 : 48;
    pCtx.drawImage(fullCanvas, cropX, cropY, cropSize, cropSize, 0, 0, 160, 160);
    const uri = portrait.toDataURL("image/png");
    PORTRAIT_DATA_URI_CACHE.set(profile.id, uri);
    return uri;
  } catch {
    return null;
  }
}
