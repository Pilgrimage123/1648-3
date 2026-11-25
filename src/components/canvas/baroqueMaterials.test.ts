import test from "node:test";
import assert from "node:assert/strict";
import {
  BAROQUE_VOLUMETRIC_FRAG,
  BAROQUE_VOLUMETRIC_VERT,
  getBaroqueChiaroscuroFrameStyle,
  getBaroqueLightingProfile,
  getBaroqueTextureSet,
  getBaroqueWaterProfile,
} from "./baroqueMaterials";
import type { ScenarioId, WeatherType } from "../../core/types";

const SCENARIOS: ScenarioId[] = ["mission1", "mission2", "mission3"];
const WEATHERS: WeatherType[] = ["clear", "rain", "fog"];

test("Baroque lighting profiles produce valid calibrated ranges across all 3 missions and weathers", () => {
  for (const scenario of SCENARIOS) {
    for (const weather of WEATHERS) {
      const profile = getBaroqueLightingProfile(scenario, weather);
      assert.ok(profile.exposure >= 0.9 && profile.exposure <= 1.12, `exposure in range for ${scenario}/${weather}`);
      assert.ok(profile.envIntensity >= 0.16 && profile.envIntensity <= 0.6, `envIntensity in range for ${scenario}/${weather}`);
      assert.ok(profile.keyIntensity > 0.8 && profile.keyIntensity <= 3.0, `keyIntensity in range for ${scenario}/${weather}`);
      assert.ok(profile.rimIntensity > 0.2 && profile.rimIntensity <= 1.0, `rimIntensity in range for ${scenario}/${weather}`);
      assert.ok(profile.shafts.length >= 2, `at least 2 volumetric shafts for ${scenario}`);
      for (const shaft of profile.shafts) {
        assert.ok(shaft.baseOpacity >= 0 && shaft.baseOpacity <= 0.2, `shaft opacity stays subtle for readability`);
      }
    }
  }
});

test("Mission 2 dawn lighting is brighter and warmer than nocturnal Missions 1 and 3", () => {
  const m1 = getBaroqueLightingProfile("mission1", "clear");
  const m2 = getBaroqueLightingProfile("mission2", "clear");
  const m3 = getBaroqueLightingProfile("mission3", "clear");

  assert.ok(m2.keyIntensity > m1.keyIntensity);
  assert.ok(m2.keyIntensity > m3.keyIntensity);
  assert.ok(m2.envIntensity > m1.envIntensity);
  assert.ok(m2.ambientIntensity > m1.ambientIntensity);
});

test("Fog weather suppresses volumetric shaft opacity compared to clear weather", () => {
  for (const scenario of SCENARIOS) {
    const clear = getBaroqueLightingProfile(scenario, "clear");
    const fog = getBaroqueLightingProfile(scenario, "fog");
    assert.ok(fog.shafts[0]!.baseOpacity < clear.shafts[0]!.baseOpacity);
    assert.ok(fog.fogFar < clear.fogFar);
  }
});

test("Water profiles differentiate Vltava dawn (M2) from nocturnal Čertovka (M1)", () => {
  const m1Clear = getBaroqueWaterProfile("mission1", "clear");
  const m2Clear = getBaroqueWaterProfile("mission2", "clear");
  const m2Rain = getBaroqueWaterProfile("mission2", "rain");

  assert.notEqual(m1Clear.specularHex, m2Clear.specularHex);
  assert.ok(m2Clear.glintStrength > m1Clear.glintStrength);
  assert.ok(m2Rain.bumpScale > m2Clear.bumpScale);
  assert.ok(m1Clear.envMapIntensity >= 0.7 && m1Clear.envMapIntensity <= 1.2);
  assert.ok(m2Clear.envMapIntensity >= 0.9 && m2Clear.envMapIntensity <= 1.4);
});

test("Chiaroscuro viewport frame preserves unobstructed center across all missions", () => {
  for (const scenario of SCENARIOS) {
    const frame = getBaroqueChiaroscuroFrameStyle(scenario);
    assert.ok(frame.vignetteGradient.includes("0) 7"));
    assert.ok(frame.cornerOpacity > 0.3 && frame.cornerOpacity <= 0.72);
  }
});

test("Procedural texture loader degrades gracefully without DOM and shaders are non-empty", () => {
  const tex = getBaroqueTextureSet();
  assert.equal(tex.paintingTextures.length, 4);
  assert.ok("masonryStoneAlbedo" in tex);
  assert.ok("floorParquetAlbedo" in tex);
  assert.ok(BAROQUE_VOLUMETRIC_VERT.includes("vNormalView"));
  assert.ok(BAROQUE_VOLUMETRIC_FRAG.includes("edgeFade"));
});
