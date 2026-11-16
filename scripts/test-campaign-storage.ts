/**
 * Kronika tažení survives a refresh within the tab (sessionStorage).
 */
import assert from "node:assert";
import { CAMPAIGN_KEY, loadCampaign, saveCampaign } from "../src/core/campaignStorage.ts";
import { createMission3Units } from "../src/core/mission3.ts";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    raw: m,
  };
}

// Empty tab -> blank chronicle (title preset later).
const s = fakeStorage();
assert.deepStrictEqual(loadCampaign(s), { oath: null, mission1SurvivorId: null });

// Refusal written, "refresh" (new load), Mise 3 seats a student in Havel's seat.
saveCampaign(s, { oath: { havel: "refuse", ondrej: "accept" }, mission1SurvivorId: "player-vaclav-michalovic" });
const reloaded = loadCampaign(s);
assert.deepStrictEqual(reloaded.oath, { havel: "refuse", ondrej: "accept" });
assert.strictEqual(reloaded.mission1SurvivorId, "player-vaclav-michalovic");
const ids = createMission3Units(reloaded).filter((u) => u.faction === "player").map((u) => u.id);
assert.ok(ids.includes("player-zak-1"), "refused Havel's seat is a student after refresh");
assert.ok(!ids.includes("player-havel"));
assert.ok(ids.includes("player-ondrej"));

// Malformed values fall back to blank.
for (const bad of ["{", "null", "42", JSON.stringify({ oath: { havel: "maybe", ondrej: "accept" } }), JSON.stringify({ oath: null, mission1SurvivorId: 7 })]) {
  s.raw.set(CAMPAIGN_KEY, bad);
  assert.deepStrictEqual(loadCampaign(s), { oath: null, mission1SurvivorId: null }, `bad value ${bad}`);
}

// No storage (SSR / node / blocked) never throws.
assert.deepStrictEqual(loadCampaign(undefined), { oath: null, mission1SurvivorId: null });
saveCampaign(undefined, { oath: null, mission1SurvivorId: null });
const throwing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
assert.deepStrictEqual(loadCampaign(throwing), { oath: null, mission1SurvivorId: null });
saveCampaign(throwing, { oath: null, mission1SurvivorId: null });

console.log("✓ Campaign chronicle storage checks passed");
