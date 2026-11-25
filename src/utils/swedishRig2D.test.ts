import test from "node:test";
import assert from "node:assert/strict";
import {
  createSwedishRigState,
  evaluateFireSequence,
  getAllSwedishProfiles,
  resolveSwedishProfile,
  resolveUsesFurketa,
  solveTwoBoneIK,
  stepSwedishRig,
  type SwedishAnimInput,
} from "./swedishRig2D";

function baseInput(overrides: Partial<SwedishAnimInput> = {}): SwedishAnimInput {
  return {
    isMoving: false,
    isOverwatch: false,
    isReloading: false,
    inCover: false,
    isDead: false,
    hasFurketa: false,
    fireElapsedSec: null,
    fireKind: "recoil",
    fireMisfired: false,
    hitElapsedSec: null,
    collapseElapsedSec: null,
    windStrength: 1.0,
    ...overrides,
  };
}

test("resolves distinct historically authentic 1648 Swedish profiles distinguishing modern M1624 offhand muskets (no furketa) from heavy furketa muskets", () => {
  const odowalsky = resolveSwedishProfile("trooper", "enemy-odowalsky", "mission1", "enemy");
  assert.ok(odowalsky);
  assert.equal(odowalsky.id, "odowalsky_officer");
  assert.equal(odowalsky.isBuffLeather, true);
  assert.equal(odowalsky.headgear, "zischagge");
  assert.equal(odowalsky.footwear, "riding_boots");
  assert.equal(odowalsky.hasCuirass, true);
  assert.equal(resolveUsesFurketa(odowalsky, false), false);
  assert.ok(odowalsky.sash);

  // Yellow Brigade Royal Guard: modernized lightened M1624 musket WITHOUT furketa + waist patronkök
  const royalMusketeer = resolveSwedishProfile("trooper", "enemy-musketeer", "mission1", "enemy");
  assert.ok(royalMusketeer);
  assert.equal(royalMusketeer.id, "yellow_brigade");
  assert.equal(royalMusketeer.headgear, "slokhatt");
  assert.equal(royalMusketeer.primaryWeapon, "light_musket");
  assert.equal(royalMusketeer.hasCartridgeBox, true);
  assert.equal(royalMusketeer.usesPaperCartridges, true);
  assert.equal(resolveUsesFurketa(royalMusketeer, false), false);
  assert.equal(royalMusketeer.footwear, "skor");

  // Explicit supportsRestFork override enables furketa even on a light_musket profile
  assert.equal(resolveUsesFurketa(royalMusketeer, true), true);

  // Blue Brigade: transitional 1648 infantry — modern lightened M1624 WITHOUT furketa, bandolier + cloak
  const gardenMusketeer = resolveSwedishProfile(
    "trooper",
    "enemy-garden-musketeer",
    "mission1",
    "enemy",
  );
  assert.ok(gardenMusketeer);
  assert.equal(gardenMusketeer.id, "blue_brigade");
  assert.equal(gardenMusketeer.primaryWeapon, "light_musket");
  assert.equal(resolveUsesFurketa(gardenMusketeer, false), false);
  assert.equal(gardenMusketeer.hasCloak, true);
  assert.equal(gardenMusketeer.hasBandolier, true);
  assert.equal(gardenMusketeer.hasCartridgeBox, true);

  // Belvedere parapet marksman: older heavy long-barrel matchlock WITH furketa & 12 Apostles
  const belvedereVeteran = resolveSwedishProfile(
    "trooper",
    "enemy-sniper-roof",
    "mission1",
    "enemy",
  );
  assert.ok(belvedereVeteran);
  assert.equal(belvedereVeteran.id, "belvedere_heavy_musketeer");
  assert.equal(belvedereVeteran.headgear, "karpus");
  assert.equal(belvedereVeteran.primaryWeapon, "heavy_musket_furketa");
  assert.equal(resolveUsesFurketa(belvedereVeteran, false), true);
  assert.equal(belvedereVeteran.hasBandolier, true);
  assert.ok(belvedereVeteran.apostleCount >= 11 && belvedereVeteran.apostleCount <= 12);

  // Mission 3 Green veteran bearer & Carolean sentry use modern M1624 without furketa
  const m3Bearer = resolveSwedishProfile("trooper", "enemy-bearer-1", "mission3", "enemy");
  assert.ok(m3Bearer);
  assert.equal(m3Bearer.id, "green_veteran");
  assert.equal(m3Bearer.primaryWeapon, "light_musket");
  assert.equal(resolveUsesFurketa(m3Bearer, false), false);

  const m3Sentry = resolveSwedishProfile("trooper", "enemy-sentry-1", "mission3", "enemy");
  assert.ok(m3Sentry);
  assert.equal(m3Sentry.id, "m3_carolean");
  assert.equal(m3Sentry.primaryWeapon, "light_musket");
  assert.equal(m3Sentry.hasCartridgeBox, true);
  assert.equal(resolveUsesFurketa(m3Sentry, false), false);

  const vanguardPikeman = resolveSwedishProfile(
    "trooper",
    "enemy-reinforcement-vanguard",
    "mission1",
    "enemy",
  );
  assert.ok(vanguardPikeman);
  assert.equal(vanguardPikeman.id, "red_pikeman");
  assert.equal(vanguardPikeman.headgear, "morion");
  assert.equal(vanguardPikeman.hasCuirass, true);
  assert.equal(vanguardPikeman.hasTassets, true);
  assert.equal(vanguardPikeman.primaryWeapon, "pike_and_musket");
  assert.equal(resolveUsesFurketa(vanguardPikeman, false), false);

  const gunner = resolveSwedishProfile("trooper", "enemy-gunner", "mission3", "enemy");
  assert.ok(gunner);
  assert.equal(gunner.id, "artillery_constable");
  assert.equal(gunner.hasLeatherApron, true);
  assert.equal(gunner.hasToolSatchel, true);
  assert.equal(gunner.primaryWeapon, "constable_luntstock");

  const harrier = resolveSwedishProfile("ranger", "enemy-harrier-1", "mission2", "enemy");
  assert.ok(harrier);
  assert.equal(harrier.id, "m2_harrier");

  const occultist = resolveSwedishProfile("sectoid", "enemy-occultist", "mission2", "enemy");
  assert.ok(occultist);
  assert.equal(occultist.id, "m2_occultist");

  // Bohemian / Imperial player units must NOT resolve to Swedish enemy rigs
  assert.equal(
    resolveSwedishProfile("ranger", "player-jan-matej", "mission1", "player"),
    null,
  );
  assert.equal(
    resolveSwedishProfile("commander", "player-colloredo", "mission1", "player"),
    null,
  );
  assert.equal(
    resolveSwedishProfile("trooper", "player-zak-1", "mission2", "player"),
    null,
  );

  // Every Swedish profile carries 1648 campaign weathering
  for (const profile of getAllSwedishProfiles()) {
    assert.ok(profile.mudIntensity > 0.4 && profile.mudIntensity <= 1);
  }
});

test("2-bone IK solver produces finite elbow and hand positions across reachable and over-extended targets", () => {
  const reachable = solveTwoBoneIK({ x: 0, y: 0 }, { x: 40, y: 10 }, 34, 32, 1);
  assert.ok(Number.isFinite(reachable.elbow.x) && Number.isFinite(reachable.elbow.y));
  assert.ok(Math.abs(Math.hypot(reachable.elbow.x, reachable.elbow.y) - 34) < 0.01);
  assert.ok(Math.abs(Math.hypot(reachable.hand.x - 40, reachable.hand.y - 10)) < 0.05);

  // Over-extended target must clamp cleanly without NaN
  const extended = solveTwoBoneIK({ x: -24, y: -59 }, { x: 240, y: -59 }, 34, 32, 1);
  assert.ok(Number.isFinite(extended.elbow.x) && Number.isFinite(extended.hand.x));
  assert.ok(Math.hypot(extended.hand.x - -24, extended.hand.y - -59) <= 66.01);
});

test("offhand M1624 firing drill (no furketa) skips furketa plant, fires faster with +0.10s pan delay, and has stronger muzzle climb than furketa-braced fire", () => {
  // Offhand M1624 (hasFurketa = false): never plants furketa, immediately shoulders
  const offhandEarly = evaluateFireSequence(0.1, false, false);
  assert.equal(offhandEarly.phase, "shoulder_aim");
  assert.equal(offhandEarly.furketaPlant, 0);
  assert.ok(offhandEarly.aimWeight > 0.3);

  const offhandPan = evaluateFireSequence(0.27, false, false);
  assert.equal(offhandPan.phase, "pan_flash");
  assert.equal(offhandPan.furketaPlant, 0);
  assert.ok(offhandPan.panFlash > 0.5);
  assert.equal(offhandPan.muzzleFlash, 0, "main muzzle blast waits +0.10s until t=0.32s");

  const offhandBlast = evaluateFireSequence(0.4, false, false);
  assert.equal(offhandBlast.phase, "muzzle_blast");
  assert.equal(offhandBlast.furketaPlant, 0);
  assert.ok(offhandBlast.muzzleFlash > 0.6);
  assert.ok(offhandBlast.recoilKick > 0.3);
  assert.ok(offhandBlast.smokeAlpha > 0.2);

  // Heavy matchlock WITH furketa (hasFurketa = true): plants furketa first, then +0.10s pan-to-muzzle delay
  const furketaPlant = evaluateFireSequence(0.1, false, true);
  assert.equal(furketaPlant.phase, "plant_furketa");
  assert.ok(furketaPlant.furketaPlant > 0.3);
  assert.equal(furketaPlant.panFlash, 0);
  assert.equal(furketaPlant.muzzleFlash, 0);

  const furketaAim = evaluateFireSequence(0.28, false, true);
  assert.equal(furketaAim.phase, "shoulder_aim");
  assert.ok(furketaAim.aimWeight > 0.5);
  assert.ok(furketaAim.headLean > 0.1);

  const furketaPan = evaluateFireSequence(0.4, false, true);
  assert.equal(furketaPan.phase, "pan_flash");
  assert.ok(furketaPan.panFlash > 0.5);
  assert.equal(furketaPan.muzzleFlash, 0);

  const furketaBlast = evaluateFireSequence(0.52, false, true);
  assert.equal(furketaBlast.phase, "muzzle_blast");
  assert.ok(furketaBlast.muzzleFlash > 0.6);
  assert.ok(furketaBlast.recoilKick > 0.3);

  // Unsupported offhand M1624 should have noticeably higher upward muzzle climb than furketa-braced musket
  assert.ok(
    offhandBlast.muzzleClimb > furketaBlast.muzzleClimb,
    `offhand climb (${offhandBlast.muzzleClimb}) should exceed braced furketa climb (${furketaBlast.muzzleClimb})`,
  );

  // Misfire flashes pan and puffs smoke, but suppresses main barrel blast in both modes
  const misfireOffhand = evaluateFireSequence(0.38, true, false);
  assert.equal(misfireOffhand.muzzleFlash, 0);
  assert.ok(misfireOffhand.smokeAlpha > 0.1);

  const misfireFurketa = evaluateFireSequence(0.5, true, true);
  assert.equal(misfireFurketa.muzzleFlash, 0);
  assert.ok(misfireFurketa.smokeAlpha > 0.1);
});

test("state machine keeps furketaPlant strictly zero on offhand M1624 across overwatch/fire/reload while animating secondary motion springs", () => {
  const rig = createSwedishRigState(1.2, false);

  // March for 0.8s -> stride cycles legs & drives apostle flasks + coat hem + plume
  let maxApostle = 0;
  let minRootY = Infinity;
  let maxRootY = -Infinity;
  for (let i = 0; i < 40; i++) {
    const pose = stepSwedishRig(
      rig,
      baseInput({ isMoving: true, hasFurketa: false, windStrength: 1.4 }),
      0.02,
    );
    assert.equal(pose.state, "march");
    assert.equal(pose.furketaPlant, 0);
    maxApostle = Math.max(maxApostle, Math.abs(pose.apostleSwing));
    minRootY = Math.min(minRootY, pose.rootY);
    maxRootY = Math.max(maxRootY, pose.rootY);
  }
  assert.ok(maxApostle > 0.08, `apostles should swing during march (got ${maxApostle})`);
  assert.ok(maxRootY - minRootY > 2.5, "center-of-gravity should bob vertically during march");

  // Overwatch & reload on modern M1624 must keep furketaPlant === 0
  const owPose = stepSwedishRig(rig, baseInput({ isOverwatch: true, hasFurketa: false }), 0.03);
  assert.equal(owPose.state, "overwatch");
  assert.equal(owPose.furketaPlant, 0);

  const reloadPose = stepSwedishRig(rig, baseInput({ isReloading: true, hasFurketa: false }), 0.03);
  assert.equal(reloadPose.state, "reload");
  assert.equal(reloadPose.furketaPlant, 0);
  assert.ok(reloadPose.reloadCycle >= 0 && reloadPose.reloadCycle < 1);

  // Offhand fire recoil snaps torso backward and shifts specular highlight
  const preFireTorso = rig.pose.torsoAngle;
  for (let i = 0; i < 12; i++) {
    stepSwedishRig(
      rig,
      baseInput({ fireElapsedSec: 0.32 + i * 0.015, fireKind: "recoil", hasFurketa: false }),
      0.016,
    );
  }
  assert.equal(rig.pose.state, "fire");
  assert.equal(rig.pose.furketaPlant, 0);
  assert.ok(
    rig.pose.torsoAngle < preFireTorso,
    "torso should kick backward on offhand M1624 musket blast",
  );
  assert.ok(Math.abs(rig.pose.specularShift) > 0.01);
});
