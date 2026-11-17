import type { Phrase } from "../i18n/runtime";
import { retainFlashes } from "../components/canvas/diegeticLights";
import { browserCampaignStorage, saveCampaign } from "../core/campaignStorage";
import type { CampaignState as PersistedCampaign } from "../core/mission3";
import type { ActiveLightFlash, CombatLogEntry, Faction } from "../core/types";

let logSeq = 1;
let fxSeq = 1;
let sessionEpoch = 0;
let moveResolveCallback: (() => void) | null = null;
const activeTimers = new Set<ReturnType<typeof setTimeout>>();

export function persistCampaign(c: PersistedCampaign): PersistedCampaign {
  saveCampaign(browserCampaignStorage(), c);
  return c;
}

export function nextFxId(): number {
  return fxSeq++;
}

export function getSessionEpoch(): number {
  return sessionEpoch;
}

export function isStaleSession(epoch: number): boolean {
  return epoch !== sessionEpoch;
}

export function registerTimer(timer: ReturnType<typeof setTimeout>): void {
  activeTimers.add(timer);
  (timer as unknown as { unref?: () => void }).unref?.();
}

export function unregisterTimer(timer: ReturnType<typeof setTimeout>): void {
  activeTimers.delete(timer);
}

export function clearRegisteredTimers(): void {
  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers.clear();
}

export function scheduleTimer(fn: () => void, ms: number, epoch = sessionEpoch): void {
  if (typeof window === "undefined") return;
  const timer = setTimeout(() => {
    activeTimers.delete(timer);
    if (isStaleSession(epoch)) return;
    fn();
  }, ms);
  registerTimer(timer);
}

export function bindMoveResolveCallback(cb: (() => void) | null): void {
  moveResolveCallback = cb;
}

export function resolveAndClearMoveCallback(): void {
  const cb = moveResolveCallback;
  moveResolveCallback = null;
  if (cb) cb();
}

export function bumpSessionEpoch(): number {
  sessionEpoch += 1;
  clearRegisteredTimers();
  resolveAndClearMoveCallback();
  return sessionEpoch;
}

export function makeLog(
  round: number,
  faction: Faction,
  message: Phrase,
  tone: CombatLogEntry["tone"] = "info",
): CombatLogEntry {
  return {
    id: `log-${logSeq++}`,
    round,
    faction,
    message,
    tone,
  };
}

/**
 * Fond dynamických záblesků (ADR-0011):
 * Udržuje max 2 explozivní světla a max 1 výstřelové světlo, vyřazuje prošlé.
 */
export function addLightFlash(
  existing: ActiveLightFlash[],
  newFlash: Omit<ActiveLightFlash, "id" | "createdAt">,
  now = Date.now(),
): ActiveLightFlash[] {
  const kept = retainFlashes(existing, newFlash.kind, now);
  return [
    ...kept,
    {
      ...newFlash,
      id: fxSeq++,
      createdAt: now,
    },
  ];
}

export function delay(ms: number): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      resolve();
    }, ms);
    registerTimer(timer);
  });
}
