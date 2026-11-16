/**
 * Locale pack: Czech grammar, phrase projection, and the one registered language.
 * scripts/test-i18n.ts
 */
import assert from "node:assert";
import { createInitialUnits } from "../src/core/GridSystem.ts";
import { pluralCs } from "../src/i18n/grammar.ts";
import {
  doorLabel,
  formatPhrase,
  listLocales,
  phrase,
  projectUnit,
  setLocale,
  text,
  unitName,
} from "../src/i18n/runtime.ts";

console.log("=== TEST I18N (CZECH PACK, LOCALE-READY) ===");

assert.deepStrictEqual(
  listLocales().map((pack) => pack.id),
  ["cs"],
  "Czech is the only registered locale",
);
assert.strictEqual(listLocales()[0]?.endonym, "Čeština");

assert.strictEqual(pluralCs(1, "nepřítele", "nepřátele", "nepřátel"), "nepřítele");
assert.strictEqual(pluralCs(3, "nepřítele", "nepřátele", "nepřátel"), "nepřátele");
assert.strictEqual(pluralCs(4, "pole", "pole", "polí"), "pole");
assert.strictEqual(pluralCs(5, "nepřítele", "nepřátele", "nepřátel"), "nepřátel");

setLocale("cs");
assert(
  formatPhrase(phrase("log.briefing.gate")).includes("Königsmarck"),
  "Briefing keeps the Königsmarck sentence",
);

const shot = formatPhrase(
  phrase("log.shot", {
    attackerId: "player-vaclav-michalovic",
    targetId: "player-jan-matej",
    weaponId: "wheellock_carbine",
    chance: 80,
    damage: 4,
    hit: true,
  }),
);
assert(shot.includes("Jana Matěje"), `Shot chronicle must use the accusative, got: ${shot}`);
assert(!shot.includes("zasáhl Jan Matěj "), "Shot chronicle must not leave the name in the nominative");

const zakShot = formatPhrase(
  phrase("log.shot", {
    attackerId: "player-plachy",
    targetId: "player-zak-1",
    weaponId: "plachy_pistol",
    chance: 70,
    damage: 3,
    hit: true,
  }),
);
assert(zakShot.includes("Žáka Klementina"), `Student shot must use the accusative, got: ${zakShot}`);
assert(!zakShot.includes("zasáhl Žák Klementina"), "Student shot must not leave the name in the nominative");
assert(formatPhrase(phrase("log.m3.victory.mute")).includes("Věž držela"));
assert(formatPhrase(phrase("log.m3.victory.scar")).toLowerCase().includes("věž držela"));
assert(formatPhrase(phrase("log.m3.loss.delivery")).includes("Třetí kára"));

assert.strictEqual(unitName("player-jan-matej", "acc"), "Jana Matěje");
assert.strictEqual(unitName("player-jan-matej", "nom"), "Jan Matěj");

const units = createInitialUnits();
const jan = units.find((unit) => unit.id === "player-jan-matej");
const colloredo = units.find((unit) => unit.id === "player-colloredo");
assert(jan && colloredo, "Mission roster includes Jan Matěj and Colloredo");
const projected = projectUnit(jan);
assert.strictEqual(projected.name, "Jan Matěj");
assert.strictEqual(projected.weapon.name, "Kolečková dragounská karabina");
assert.strictEqual(colloredo.buffId, "limp");
assert(
  colloredo.buffTitle?.includes("kulhání"),
  "Colloredo limp title is projected from buffId",
);
assert(
  !formatPhrase(phrase("ui.epilogue.m3.defeatMeta", { count: 3 })).includes("Colloredo"),
  "Mission 3 defeat meta must not mention Colloredo",
);
assert.strictEqual(unitName("enemy-gunner", "nom"), "Dělmistr");
assert.strictEqual(unitName("enemy-bearer-2", "nom"), "Druhý nosič prachu");
assert.strictEqual(unitName("enemy-relief-1", "nom"), "Švédská posila");
assert(
  doorLabel("relief-west").includes("Západní"),
  "Mission 3 relief-west door must resolve cleanly",
);
assert(
  text("ui.sacrifice.body").includes(text("ui.sacrifice.clause")),
  "Sacrifice body must contain sacrifice clause for splitAround highlighting",
);

console.log("✓ Czech pack declines names, pluralizes, and projects unit copy.");
