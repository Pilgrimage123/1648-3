/**
 * Kronika tažení persistence: one sessionStorage key, survives a refresh, ends with the tab.
 * Storage is injected so the rules stay testable without a browser.
 */
import type { CampaignState } from "./mission3";

export const CAMPAIGN_KEY = "praha1648.campaign";

export interface CampaignStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const blank = (): CampaignState => ({ oath: null, mission1SurvivorId: null });
const PICKS = new Set(["accept", "refuse", "fallen"]);

function isCampaign(v: unknown): v is CampaignState {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  const sid = c.mission1SurvivorId;
  if (!(sid === null || typeof sid === "string")) return false;
  const oath = c.oath as Record<string, unknown> | null | undefined;
  if (oath === null) return true;
  return !!oath && typeof oath === "object" && PICKS.has(oath.havel as string) && PICKS.has(oath.ondrej as string);
}

export function loadCampaign(storage: CampaignStorage | undefined): CampaignState {
  try {
    const raw = storage?.getItem(CAMPAIGN_KEY);
    if (!raw) return blank();
    const parsed: unknown = JSON.parse(raw);
    if (!isCampaign(parsed)) return blank();
    return {
      oath: parsed.oath ? { havel: parsed.oath.havel, ondrej: parsed.oath.ondrej } : null,
      mission1SurvivorId: parsed.mission1SurvivorId,
    };
  } catch {
    return blank();
  }
}

export function saveCampaign(storage: CampaignStorage | undefined, campaign: CampaignState): void {
  try {
    storage?.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  } catch {
    // Storage blocked or full: the chronicle stays in memory for this sitting.
  }
}

/** The tab's sessionStorage, or undefined outside a browser. */
export function browserCampaignStorage(): CampaignStorage | undefined {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}
