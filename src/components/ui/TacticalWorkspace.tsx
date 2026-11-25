import {
  Flame,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Trophy,
  UserCheck,
  Wrench,
} from "lucide-react";
import { TacticalScene } from "../canvas/TacticalScene";
import { BaroqueViewportFrame } from "./BaroqueViewportFrame";
import { CombatChronicleFeed } from "./CombatChronicleFeed";
import { InspectDossier } from "./InspectDossier";
import { MissionStatusChip } from "./MissionStatusChip";
import { TacticalActionRibbon } from "./TacticalActionRibbon";
import { TacticalAdvisorWidget } from "./TacticalAdvisorWidget";
import { TacticalUtilitiesCapsule } from "./TacticalUtilitiesCapsule";
import { TurnSplashBanner } from "./TurnSplashBanner";
import { TutorialOrderBanner } from "./TutorialOrderBanner";
import { perkCopy, text, unitName, useLocale } from "../../i18n";
import { useGameStore } from "../../store/useGameStore";

function splitAround(source: string, mark: string) {
  const at = source.indexOf(mark);
  if (at < 0) return null;
  return {
    before: source.slice(0, at),
    mark,
    after: source.slice(at + mark.length),
  };
}

export function TacticalWorkspace({ paused }: { paused: boolean }) {
  const outcome = useGameStore((s) => s.outcome);
  const victoryReason = useGameStore((s) => s.victoryReason);
  const defeatReason = useGameStore((s) => s.defeatReason);
  const isCapturingAnim = useGameStore((s) => s.isCapturingAnim);
  const round = useGameStore((s) => s.round);
  const resetGame = useGameStore((s) => s.resetGame);
  const scenario = useGameStore((s) => s.scenario);
  const m2 = useGameStore((s) => s.m2);
  const m3 = useGameStore((s) => s.m3);
  const oath = useGameStore((s) => s.oath);
  const openBriefing = useGameStore((s) => s.openBriefing);
  const chooseOath = useGameStore((s) => s.chooseOath);
  const havelLives = useGameStore((s) =>
    s.units.some((u) => u.id === "player-havel" && u.alive && u.hp > 0),
  );
  const ondrejLives = useGameStore((s) =>
    s.units.some((u) => u.id === "player-ondrej" && u.alive && u.hp > 0),
  );
  const matejLives = useGameStore((s) =>
    s.units.some((u) => u.id === "player-jan-matej" && u.alive && u.hp > 0),
  );
  const bartolomejLives = useGameStore((s) =>
    s.units.some((u) => u.id === "player-bartolomej" && u.alive && u.hp > 0),
  );
  const vaclavLives = useGameStore((s) =>
    s.units.some((u) => u.id === "player-vaclav-michalovic" && u.alive && u.hp > 0),
  );
  const sacrificeDilemmaOpen = useGameStore((s) => s.sacrificeDilemmaOpen);
  const ironVigilPerk = useGameStore((s) => s.ironVigilPerk);
  const chooseSacrifice = useGameStore((s) => s.chooseSacrifice);
  const locale = useLocale();
  const sacrificeBody = text("ui.sacrifice.body", undefined, locale);
  const sacrificeParts = splitAround(sacrificeBody, text("ui.sacrifice.clause", undefined, locale));
  const boat3 = text("ui.epilogue.boat.3.body", undefined, locale);
  const boat3Parts = splitAround(boat3, text("ui.sacrifice.vigilQuote", undefined, locale));
  const vigilPerk = ironVigilPerk ? perkCopy(ironVigilPerk.perkId, locale) : null;

  return (
    <div
      className={
        paused
          ? "pointer-events-none invisible fixed inset-0 overflow-hidden select-none"
          : "relative h-dvh w-screen overflow-hidden bg-slate-950 select-none"
      }
      aria-hidden={paused}
    >
      {/* 1. Fullscreen 2.5D React Three Fiber Taktická scéna (100% plocha obrazovky) */}
      <div className="absolute inset-0">
        <TacticalScene paused={paused} />
      </div>

      {/* 1b. Periferní barokní zlaté filigránové rohy (pointer-events-none, bez zakrytí středu) */}
      <BaroqueViewportFrame />

      {/* 2. Filmový středový banner změny tahu */}
      <TurnSplashBanner />

      {/* 2c. Horní rozkazový pruh skriptovaného tutoriálu (XCOM 2 Style) */}
      <TutorialOrderBanner />

      {/* 2b. Krátká dramatická animace na mapě v okamžiku dokonání zajetí maršála (2/2 kola) */}
      {isCapturingAnim && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
          <div className="baroque-crimson-cartouche baroque-border rounded-xl px-7 py-3.5 shadow-[0_0_50px_rgba(239,68,68,0.7)] text-center animate-bounce">
            <div className="font-cinzel text-xs font-bold uppercase tracking-widest text-amber-300">
              {text("ui.capture.done", undefined, locale)}
            </div>
            <div className="font-cinzel text-lg md:text-xl font-black uppercase tracking-wider text-rose-100 mt-0.5">
              {text("ui.capture.shackled", undefined, locale)}
            </div>
          </div>
        </div>
      )}

      <InspectDossier />

      {/* 3. Plovoucí periferní HUD widgety (XCOM Architecture) */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-col gap-2.5">
        <MissionStatusChip />
        <TacticalAdvisorWidget />
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-end gap-2 max-w-xs sm:max-w-sm">
        <TacticalUtilitiesCapsule />
        <CombatChronicleFeed />
      </div>

      {/* Spodní střed: Sjednocená taktická akční lišta (Tactical Action Ribbon & Aiming HUD) */}
      <TacticalActionRibbon />

      {/* 4. Dilema oběti u pramice na Čertovce (Paradoxní oběť) */}
      {sacrificeDilemmaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="max-w-2xl w-full baroque-cartouche baroque-border rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)] space-y-5 text-amber-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-amber-900/60 pb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Flame className="w-6 h-6 animate-pulse text-amber-400" />
              </div>
              <div>
                <h2 className="font-cinzel text-xl md:text-2xl font-black uppercase tracking-wider text-amber-200">
                  {text("ui.sacrifice.title", undefined, locale)}
                </h2>
                <div className="font-literata italic text-xs text-amber-400/90 mt-0.5">
                  {text("ui.sacrifice.when", undefined, locale)}
                </div>
              </div>
            </div>

            <p className="font-literata text-sm text-amber-100/90 leading-relaxed bg-black/60 p-4 rounded-xl border border-amber-900/60">
              {sacrificeParts ? (
                <>
                  {sacrificeParts.before}
                  <strong className="font-cinzel text-amber-300 font-bold">
                    {sacrificeParts.mark}
                  </strong>
                  {sacrificeParts.after}
                </>
              ) : (
                sacrificeBody
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {matejLives && (
                <button
                  type="button"
                  onClick={() => chooseSacrifice("player-jan-matej")}
                  className="flex flex-col justify-between p-4 rounded-xl baroque-bronze-btn text-left transition-all group cursor-pointer border border-amber-700/60 hover:border-amber-400"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span className="font-cinzel font-bold text-sm text-amber-100 group-hover:text-amber-200">
                        {unitName("player-jan-matej", "nom", locale)}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/70 font-literata uppercase tracking-wider font-bold block mb-2">
                      {text("ui.sacrifice.matej.role", undefined, locale)}
                    </span>
                    <p className="text-xs text-amber-200/90 italic font-literata leading-snug mb-3">
                      {text("ui.sacrifice.matej.line", undefined, locale)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-900/60 text-[11px] text-amber-300 font-cinzel font-bold">
                    {text("ui.sacrifice.perkLabel", {
                      names: text("ui.sacrifice.matej.perkName", undefined, locale),
                    }, locale)}
                    <span className="block text-[10px] text-amber-200/70 font-literata font-normal">
                      {text("ui.sacrifice.matej.perk", undefined, locale)}
                    </span>
                  </div>
                </button>
              )}

              {bartolomejLives && (
                <button
                  type="button"
                  onClick={() => chooseSacrifice("player-bartolomej")}
                  className="flex flex-col justify-between p-4 rounded-xl baroque-bronze-btn text-left transition-all group cursor-pointer border border-amber-700/60 hover:border-amber-400"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-cinzel font-bold text-sm text-amber-100 group-hover:text-amber-200">
                        {unitName("player-bartolomej", "nom", locale)}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/70 font-literata uppercase tracking-wider font-bold block mb-2">
                      {text("ui.sacrifice.bart.role", undefined, locale)}
                    </span>
                    <p className="text-xs text-amber-200/90 italic font-literata leading-snug mb-3">
                      {text("ui.sacrifice.bart.line", undefined, locale)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-900/60 text-[11px] text-amber-300 font-cinzel font-bold">
                    {text("ui.sacrifice.perkLabel", {
                      names: text("ui.sacrifice.bart.perkName", undefined, locale),
                    }, locale)}
                    <span className="block text-[10px] text-amber-200/70 font-literata font-normal">
                      {text("ui.sacrifice.bart.perk", undefined, locale)}
                    </span>
                  </div>
                </button>
              )}

              {vaclavLives && (
                <button
                  type="button"
                  onClick={() => chooseSacrifice("player-vaclav-michalovic")}
                  className="flex flex-col justify-between p-4 rounded-xl baroque-bronze-btn text-left transition-all group cursor-pointer border border-amber-700/60 hover:border-amber-400"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-cinzel font-bold text-sm text-amber-100 group-hover:text-amber-200">
                        {unitName("player-vaclav-michalovic", "nom", locale)}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400/70 font-literata uppercase tracking-wider font-bold block mb-2">
                      {text("ui.sacrifice.vaclav.role", undefined, locale)}
                    </span>
                    <p className="text-xs text-amber-200/90 italic font-literata leading-snug mb-3">
                      {text("ui.sacrifice.vaclav.line", undefined, locale)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-900/60 text-[11px] text-amber-300 font-cinzel font-bold">
                    {text("ui.sacrifice.perkLabel", {
                      names: text("ui.sacrifice.vaclav.perkName", undefined, locale),
                    }, locale)}
                    <span className="block text-[10px] text-amber-200/70 font-literata font-normal">
                      {text("ui.sacrifice.vaclav.perk", undefined, locale)}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {outcome !== "ongoing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="max-w-xl w-full baroque-cartouche baroque-border rounded-2xl p-6 text-center shadow-[0_0_70px_rgba(0,0,0,0.95)] space-y-4 text-amber-50">
            <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center bg-amber-950/80 border border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              {outcome === "victory" ? (
                <Trophy className="w-7 h-7 text-amber-300" />
              ) : (
                <Skull className="w-7 h-7 text-rose-400" />
              )}
            </div>
            <div>
              <h2 className="font-cinzel text-2xl font-black uppercase tracking-wider text-amber-200">
                {outcome === "victory"
                  ? scenario === "mission3"
                    ? text("ui.epilogue.m3.title", undefined, locale)
                    : scenario === "mission2"
                      ? text("ui.epilogue.m2.title", undefined, locale)
                      : victoryReason === "boat_escape"
                        ? text("ui.epilogue.boatTitle", undefined, locale)
                        : text("ui.epilogue.wipeTitle", undefined, locale)
                  : scenario === "mission3"
                    ? text("ui.epilogue.m3.defeat", undefined, locale)
                    : scenario === "mission2"
                      ? text("ui.epilogue.m2.defeat", undefined, locale)
                      : text("ui.epilogue.defeatTitle", undefined, locale)}
              </h2>
              <div className="font-cinzel text-xs uppercase tracking-widest text-amber-400 mt-1">
                {outcome === "victory"
                  ? scenario === "mission3"
                    ? text("ui.epilogue.m3.victoryMeta", { count: round }, locale)
                    : text("ui.epilogue.victoryMeta", { count: round }, locale)
                  : scenario === "mission3"
                    ? text("ui.epilogue.m3.defeatMeta", { count: round }, locale)
                    : scenario === "mission2"
                      ? text("ui.epilogue.m2.defeatMeta", { count: round }, locale)
                      : text(
                          "ui.epilogue.defeatMeta",
                          { count: round, capture: defeatReason ?? undefined },
                          locale,
                        )}
              </div>
            </div>

            <div className="font-literata text-sm text-amber-100/90 leading-relaxed text-left bg-black/60 p-4 rounded-xl border border-amber-900/60 space-y-3">
              {scenario === "mission3" ? (
                outcome === "victory" ? (
                  <p>
                    {text(
                      m3?.deliveries === 0 ? "ui.epilogue.m3.mute" : "ui.epilogue.m3.scar",
                      undefined,
                      locale,
                    )}
                  </p>
                ) : (
                  <strong className="font-cinzel text-rose-300 block">
                    {text(
                      m3?.loss === "delivery"
                        ? "ui.epilogue.m3.defeat.delivery"
                        : m3?.loss === "wiped"
                          ? "ui.epilogue.m3.defeat.wiped"
                          : "ui.epilogue.m3.defeat.plachy",
                      undefined,
                      locale,
                    )}
                  </strong>
                )
              ) : scenario === "mission2" ? (
                outcome === "victory" ? (
                  <>
                    <p>{text("ui.epilogue.m2.body", undefined, locale)}</p>
                    {oath ? (
                      <p className="font-cinzel text-amber-300">
                        {text("ui.oath.done", undefined, locale)}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {havelLives && ondrejLives && (
                          <button
                            type="button"
                            onClick={() => chooseOath("both")}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-cinzel text-xs font-bold cursor-pointer"
                          >
                            {text("ui.oath.both", undefined, locale)}
                          </button>
                        )}
                        {havelLives && (
                          <button
                            type="button"
                            onClick={() => chooseOath("havel")}
                            className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-100 font-cinzel text-xs cursor-pointer"
                          >
                            {text("ui.oath.havel", undefined, locale)}
                          </button>
                        )}
                        {ondrejLives && (
                          <button
                            type="button"
                            onClick={() => chooseOath("ondrej")}
                            className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-100 font-cinzel text-xs cursor-pointer"
                          >
                            {text("ui.oath.ondrej", undefined, locale)}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => chooseOath("neither")}
                          className="px-3 py-1.5 rounded-lg border border-amber-900 text-amber-200/80 font-cinzel text-xs cursor-pointer"
                        >
                          {text("ui.oath.neither", undefined, locale)}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <strong className="font-cinzel text-rose-300 block">
                    {m2?.loss === "rite"
                      ? text("ui.epilogue.m2.defeat.rite", undefined, locale)
                      : m2?.loss === "windlass"
                        ? text("ui.epilogue.m2.defeat.windlass", undefined, locale)
                        : m2?.loss === "wiped"
                          ? text("ui.epilogue.m2.defeat.wiped", undefined, locale)
                          : text("ui.epilogue.m2.defeat.plachy", undefined, locale)}
                  </strong>
                )
              ) : outcome === "victory" ? (
                victoryReason === "boat_escape" ? (
                  <>
                    <div>
                      <strong className="font-cinzel text-amber-300 block mb-0.5">
                        {text("ui.epilogue.boat.1.title", undefined, locale)}
                      </strong>
                      {text("ui.epilogue.boat.1.body", undefined, locale)}
                    </div>

                    <div>
                      <strong className="font-cinzel text-amber-400 block mb-0.5">
                        {text("ui.epilogue.boat.2.title", undefined, locale)}
                      </strong>
                      {text("ui.epilogue.boat.2.body", { heroId: ironVigilPerk?.heroId }, locale)}
                    </div>

                    <div>
                      <strong className="font-cinzel text-amber-200 block mb-0.5">
                        {text("ui.epilogue.boat.3.title", undefined, locale)}
                      </strong>
                      {boat3Parts ? (
                        <>
                          {boat3Parts.before}
                          <em>{boat3Parts.mark}</em>
                          {boat3Parts.after}
                        </>
                      ) : (
                        boat3
                      )}
                    </div>

                    {ironVigilPerk && vigilPerk && (
                      <div className="bg-amber-950/70 border border-amber-500/60 rounded-xl p-3 flex items-start gap-3 mt-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                            {text("ui.epilogue.perk.member", { heroId: ironVigilPerk.heroId }, locale)}
                          </div>
                          <div className="font-cinzel text-xs font-bold text-amber-100 mt-0.5">
                            {text("ui.epilogue.perk.name", { names: vigilPerk.name }, locale)}
                          </div>
                          <div className="font-literata text-[11px] text-amber-200/80 mt-0.5">
                            {vigilPerk.desc}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <strong className="font-cinzel text-amber-300 block mb-1">
                      {text("ui.epilogue.wipe.heading", undefined, locale)}
                    </strong>
                    {text("ui.epilogue.wipe.body", undefined, locale)}
                  </>
                )
              ) : (
                <>
                  <strong className="font-cinzel text-rose-300 block mb-1">
                    {defeatReason === "surrounded_unprotected"
                      ? text("ui.epilogue.defeat.surrounded", undefined, locale)
                      : defeatReason === "all_companions_fallen"
                        ? text("ui.epilogue.defeat.fallen", undefined, locale)
                        : text("ui.epilogue.defeat.down", undefined, locale)}
                  </strong>
                  {defeatReason === "surrounded_unprotected"
                    ? text("ui.epilogue.defeat.surroundedBody", undefined, locale)
                    : defeatReason === "all_companions_fallen"
                      ? text("ui.epilogue.defeat.fallenBody", undefined, locale)
                      : text("ui.epilogue.defeat.downBody", undefined, locale)}{" "}
                  {text("ui.epilogue.defeat.coda", undefined, locale)}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={resetGame}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 border border-amber-300 text-stone-950 font-cinzel font-bold text-sm uppercase tracking-wider shadow-[0_4px_16px_rgba(245,158,11,0.5)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{text("ui.epilogue.again", undefined, locale)}</span>
              </button>
              <button
                type="button"
                onClick={openBriefing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-700 text-amber-100 font-cinzel text-sm cursor-pointer"
              >
                {text("ui.epilogue.other", undefined, locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
