import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCityInstancePlan,
  buildPragueHouses,
  createPragueArchitectureGeometries,
  disposePragueArchitectureGeometries,
  distToBoardBounds,
  getMissionRowSpecs,
  localToWorld,
  maxSafeEavesHeight,
  maxSafeTotalHeight,
  MISSION2_BOARD_BOUNDS,
  MISSION3_BOARD_BOUNDS,
  STANDARD_BOARD_BOUNDS,
  type MissionId,
} from "./pragueArchitecture";

test("localToWorld transforms canonical house +Z front normal accurately across all 4 cardinal directions", () => {
  const cases: Array<{
    normal: [number, number];
    expectedFront: [number, number];
    expectedRight: [number, number];
  }> = [
    { normal: [0, 1], expectedFront: [0, 1], expectedRight: [1, 0] },
    { normal: [0, -1], expectedFront: [0, -1], expectedRight: [-1, 0] },
    { normal: [1, 0], expectedFront: [1, 0], expectedRight: [0, -1] },
    { normal: [-1, 0], expectedFront: [-1, 0], expectedRight: [0, 1] },
  ];

  for (const c of cases) {
    const rotY = Math.atan2(c.normal[0], c.normal[1]);
    const h = { x: 10, z: -5, rotY };
    const [fx, fy, fz] = localToWorld(h, 0, 2, 1);
    assert.ok(Math.abs(fx - (10 + c.expectedFront[0])) < 1e-6);
    assert.equal(fy, 2);
    assert.ok(Math.abs(fz - (-5 + c.expectedFront[1])) < 1e-6);

    const [rx, , rz] = localToWorld(h, 1, 0, 0);
    assert.ok(Math.abs(rx - (10 + c.expectedRight[0])) < 1e-6);
    assert.ok(Math.abs(rz - (-5 + c.expectedRight[1])) < 1e-6);
  }
});

test("all 3 missions synthesize enlarged Renaissance, Baroque, and Gothic Prague houses within camera clearance", () => {
  const configs: Array<{ mission: MissionId; night: boolean; seed: number }> = [
    { mission: "mission1", night: true, seed: 1648 },
    { mission: "mission2", night: false, seed: 2607 },
    { mission: "mission3", night: true, seed: 2707 },
  ];

  for (const cfg of configs) {
    const bounds =
      cfg.mission === "mission3"
        ? MISSION3_BOARD_BOUNDS
        : cfg.mission === "mission2"
          ? MISSION2_BOARD_BOUNDS
          : STANDARD_BOARD_BOUNDS;
    const rows = getMissionRowSpecs(cfg.mission);
    const houses = buildPragueHouses(rows, cfg.night, cfg.seed, bounds);

    assert.ok(houses.length >= 20, `${cfg.mission} generates a rich urban surround (${houses.length})`);

    let ren = 0;
    let bar = 0;
    let got = 0;
    let widthSum = 0;
    let heightSum = 0;

    for (const hs of houses) {
      if (hs.style === "renaissance") ren++;
      else if (hs.style === "baroque") bar++;
      else got++;

      widthSum += hs.w;
      heightSum += hs.h;

      // Never intersect the playable board rectangle
      const nearX = hs.x + hs.normal[0] * (hs.d * 0.5);
      const nearZ = hs.z + hs.normal[1] * (hs.d * 0.5);
      const nearDist = distToBoardBounds(nearX, nearZ, bounds);
      assert.ok(nearDist >= 0.75, `${cfg.mission} house stays clear of board edge (nearDist=${nearDist})`);

      // Strictly obey camera sightline clearance envelope
      assert.ok(
        hs.h <= maxSafeEavesHeight(hs.nearDist) + 1e-6,
        `${cfg.mission} eaves ${hs.h} <= safe cap ${maxSafeEavesHeight(hs.nearDist)}`,
      );
      assert.ok(
        hs.h + hs.roofH <= maxSafeTotalHeight(hs.centerDist) + 1e-6,
        `${cfg.mission} ridge ${hs.h + hs.roofH} <= safe cap ${maxSafeTotalHeight(hs.centerDist)}`,
      );

      // Enlarged realistic burgher scale (wider & taller than old 2.4-4.6 m dollhouse boxes)
      assert.ok(hs.w >= 3.6 && hs.w <= 9.2, `realistic parcel width ${hs.w}`);
      assert.ok(hs.h >= 4.0, `at least 2 real stories (${hs.h})`);
    }

    // Historically grounded Prague 1648 mix: Renaissance + Baroque dominant, Gothic present
    assert.ok(ren > 0 && bar > 0 && got > 0, `${cfg.mission} has all 3 periods (R:${ren} B:${bar} G:${got})`);
    assert.ok(
      ren + bar > got,
      `${cfg.mission} is predominantly Renaissance & Baroque (R:${ren} B:${bar} vs G:${got})`,
    );

    // Average house is substantially larger than old ~3.5 m wide / ~4.2 m eaves boxes
    assert.ok(widthSum / houses.length >= 5.2, `${cfg.mission} avg width >= 5.2m`);
    assert.ok(heightSum / houses.length >= 6.0, `${cfg.mission} avg eaves >= 6.0m`);

    // City instance plan builds all 1618–1648 period architectural detail layers
    const plan = buildCityInstancePlan(houses, cfg.night, cfg.seed + 99);
    assert.equal(
      plan.sgraffitoHouses.length +
        plan.frescoHouses.length +
        plan.gothicPlasterHouses.length +
        plan.baroqueStuccoHouses.length,
      houses.length,
    );
    assert.ok(plan.sgraffitoHouses.length > 0, `${cfg.mission} has Renaissance sgraffito facades`);
    assert.ok(plan.frescoHouses.length > 0, `${cfg.mission} has Renaissance frescoed facades`);
    assert.ok(plan.gothicPlasterHouses.length > 0, `${cfg.mission} has Gothic painted-quoin facades`);
    assert.ok(plan.baroqueStuccoHouses.length > 0, `${cfg.mission} has Early Baroque sculpted stucco facades`);

    assert.equal(plan.gableRoofs.length + plan.mansardRoofs.length, houses.length);
    assert.equal(plan.plinths.length, houses.length);
    assert.ok(plan.cornices.length >= houses.length);
    assert.ok(plan.pilasters.length >= (plan.sgraffitoHouses.length + plan.frescoHouses.length + plan.baroqueStuccoHouses.length) * 2);
    assert.ok(plan.windows.length >= houses.length * 4);
    assert.ok(plan.houseSigns.length > 0, `${cfg.mission} features painted/relief house signs`);
    assert.ok(plan.basketGrilles.length > 0, `${cfg.mission} features Renaissance ground-floor basket grilles`);
    assert.ok(
      plan.windows.some((w) => w.pediment === "baroque_tri") &&
        plan.windows.some((w) => w.pediment === "baroque_seg"),
      `${cfg.mission} alternates Baroque triangular & segmental suprafenestras`,
    );
    assert.ok(
      plan.renaissanceGables.length +
        plan.renaissanceAttics.length +
        plan.baroqueGables.length +
        plan.gothicGables.length >=
        houses.length,
    );

    // Every period portal matches its period oak door 1:1
    assert.equal(plan.gothicPortals.length, plan.gothicDoors.length);
    assert.equal(plan.renaissancePortals.length, plan.renaissanceDoors.length);
    assert.equal(plan.baroquePortals.length, plan.baroqueDoors.length);

    // Zero plinth Z-clipping: every window sill/apron stays strictly above the maximum stone plinth top (0.68 m)
    const maxPlinthTop = Math.max(...plan.plinths.map((p) => p.y + p.sy * 0.5));
    assert.ok(maxPlinthTop <= 0.7, `${cfg.mission} plinth top (${maxPlinthTop}) <= 0.70m`);
    for (const wd of plan.windows) {
      const bottomFactor = wd.style === "baroque" ? 0.64 : 0.58;
      const sillBottom = wd.y - wd.h * bottomFactor;
      assert.ok(
        sillBottom > maxPlinthTop,
        `${cfg.mission} ${wd.style} window sill (${sillBottom.toFixed(2)}) must sit above plinth top (${maxPlinthTop.toFixed(2)})`,
      );
    }

    // Zero plinth Z-clipping & zero pilaster bisection on every period portal/door
    let gIdx = 0;
    let rIdx = 0;
    let bIdx = 0;
    for (let i = 0; i < houses.length; i++) {
      const hs = houses[i]!;
      const pl = plan.plinths[i]!;
      if (!hs.hasPortal) continue;
      const door =
        hs.style === "gothic"
          ? plan.gothicDoors[gIdx++]!
          : hs.style === "baroque"
            ? plan.baroqueDoors[bIdx++]!
            : plan.renaissanceDoors[rIdx++]!;
      const doorDist = (door.x - hs.x) * hs.normal[0] + (door.z - hs.z) * hs.normal[1];
      const plinthFront = pl.sz * 0.5;
      assert.ok(
        doorDist > plinthFront + 0.015,
        `${cfg.mission} ${hs.style} door (${doorDist.toFixed(3)}) must be proud of plinth front (${plinthFront.toFixed(3)})`,
      );
      const portal =
        hs.style === "gothic"
          ? plan.gothicPortals[gIdx - 1]!
          : hs.style === "baroque"
            ? plan.baroquePortals[bIdx - 1]!
            : plan.renaissancePortals[rIdx - 1]!;
      const doorTop = door.y + door.sy * 0.5;
      // Door must fill the full portal arch height (zero wall plaster crescent leaking at top)
      assert.ok(
        doorTop >= portal.sy * 0.97,
        `${cfg.mission} ${hs.style} door top (${doorTop.toFixed(2)}) must fill portal arch (${portal.sy.toFixed(2)})`,
      );

      // Early Baroque altán balcony balustrade top (1.26 * portalH) must stay clear of 1st-floor window sills
      if (hs.style === "baroque") {
        const balustradeTop = portal.sy * 1.26;
        for (const wd of plan.windows) {
          if (wd.style !== "baroque" || wd.floor !== 1) continue;
          const horizDist = Math.hypot(wd.x - portal.x, wd.z - portal.z);
          if (horizDist < 1.2) {
            const sillApronBottom = wd.y - wd.h * 0.68;
            assert.ok(
              balustradeTop <= sillApronBottom + 0.02,
              `${cfg.mission} Baroque altán balustrade (${balustradeTop.toFixed(2)}) must clear 1st-floor sill apron (${sillApronBottom.toFixed(2)})`,
            );
          }
        }
      }

      for (const pil of plan.pilasters) {
        const horizDist = Math.hypot(pil.x - door.x, pil.z - door.z);
        const pilBottom = pil.y - pil.sy * 0.5;
        if (horizDist < door.sx * 0.5) {
          assert.ok(
            pilBottom >= doorTop - 0.05,
            `${cfg.mission} center pilaster bottom (${pilBottom.toFixed(2)}) must sit above portal top (${doorTop.toFixed(2)})`,
          );
        }
      }
    }

    // Zero window surround hood overlap on the same floor (including Renaissance paired windows)
    for (let i = 0; i < plan.windows.length; i++) {
      const a = plan.windows[i]!;
      const hoodHalfA = a.w * 0.7;
      for (let j = i + 1; j < plan.windows.length; j++) {
        const b = plan.windows[j]!;
        if (Math.abs(a.y - b.y) > 0.2 || Math.abs(a.rotY - b.rotY) > 0.01) continue;
        const dist = Math.hypot(a.x - b.x, a.z - b.z);
        const minClear = hoodHalfA + b.w * 0.7;
        assert.ok(
          dist >= minClear - 0.01,
          `${cfg.mission} same-floor window hoods must not overlap (dist=${dist.toFixed(3)} < ${minClear.toFixed(3)})`,
        );
      }
    }
  }
});

test("Mission 2 Old Town houses clear the Křižovníci monastery & south corner cutaways and Vltava water", () => {
  const rows = getMissionRowSpecs("mission2");
  const houses = buildPragueHouses(rows, false, 2607, MISSION2_BOARD_BOUNDS);
  for (const hs of houses) {
    const halfX = Math.abs(hs.normal[0]) > 0.5 ? hs.d * 0.5 : hs.w * 0.5;
    const halfZ = Math.abs(hs.normal[1]) > 0.5 ? hs.d * 0.5 : hs.w * 0.5;
    const minX = hs.x - halfX;
    const maxX = hs.x + halfX;
    const minZ = hs.z - halfZ;
    const maxZ = hs.z + halfZ;

    // Vltava channel occupies x ∈ [-57.0, +4.96]
    const overlapsRiver = maxX > -56.5 && minX < 5.0;
    assert.equal(
      overlapsRiver,
      false,
      `Mission 2 house x=[${minX.toFixed(1)}, ${maxX.toFixed(1)}] must stay out of Vltava`,
    );

    // Křižovníci cutaway occupies x ∈ [9.6, 17.0], z ∈ [-12.3, -9.1]
    const overlapsKrizovnici = maxX > 9.5 && minX < 17.1 && maxZ > -12.4 && minZ < -9.0;
    assert.equal(overlapsKrizovnici, false, `Mission 2 house must clear Křižovníci cutaway`);

    // South Old Town corner cutaway occupies x ∈ [11.0, 17.5], z ∈ [9.2, 12.2]
    const overlapsSouthCutaway = maxX > 10.9 && minX < 17.6 && maxZ > 9.1 && minZ < 12.3;
    assert.equal(overlapsSouthCutaway, false, `Mission 2 house must clear south corner cutaway`);
  }
});

test("Mission 3 surrounding houses stay completely clear of the Čertovka canal corridor", () => {
  const rows = getMissionRowSpecs("mission3");
  const houses = buildPragueHouses(rows, true, 2707, MISSION3_BOARD_BOUNDS);
  for (const hs of houses) {
    const halfX = Math.abs(hs.normal[0]) > 0.5 ? hs.d * 0.5 : hs.w * 0.5;
    const minX = hs.x - halfX;
    const maxX = hs.x + halfX;
    // Čertovka channel runs x ∈ [-12.8, -9.6]
    const overlapsCanal = maxX > -12.9 && minX < -9.5;
    assert.equal(
      overlapsCanal,
      false,
      `Mission 3 house [${minX.toFixed(1)}, ${maxX.toFixed(1)}] must not overlap Čertovka [-12.8, -9.6]`,
    );
  }
});

test("all procedural architectural BufferGeometries build cleanly with valid normals and normalized gable UVs", () => {
  const geoms = createPragueArchitectureGeometries();
  try {
    for (const [name, g] of Object.entries(geoms)) {
      const pos = g.attributes.position;
      const norm = g.attributes.normal;
      assert.ok(pos && pos.count > 0, `${name} has vertices`);
      assert.ok(norm && norm.count === pos.count, `${name} has matching normals`);
      assert.ok(g.boundingSphere && g.boundingSphere.radius > 0, `${name} has valid bounding sphere`);
    }
    // Extruded gables & attics must have UVs normalized inside [0, 1] (no negative u=-0.5 center seam)
    for (const key of ["renaissanceGable", "renaissanceAttic", "baroqueGable", "gothicGable"] as const) {
      const uv = geoms[key].attributes.uv!;
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        assert.ok(u >= -1e-5 && u <= 1 + 1e-5, `${key} u=${u} within [0,1]`);
        assert.ok(v >= -1e-5 && v <= 1 + 1e-5, `${key} v=${v} within [0,1]`);
      }
    }
  } finally {
    disposePragueArchitectureGeometries(geoms);
  }
});
