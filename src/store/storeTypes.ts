import type { Phrase } from "../i18n/runtime";
import type { InspectPin } from "../core/inspectView";
import type { GridSystem } from "../core/GridSystem";
import type { CameraDirectorState, StepInteractionKind } from "../core/CameraDirector";
import type { CampaignState, Mission3Clock } from "../core/mission3";
import type { Mission2Clock } from "../core/mission2";
import type { PerkId } from "../i18n/runtime";
import type {
  ActionMode,
  ActiveLightFlash,
  CaptureReason,
  CardinalDir,
  CombatLogEntry,
  Faction,
  FloorLevel,
  FogOfWarSnapshot,
  GridCoord,
  GuidedTutorialState,
  GuidedTutorialStep,
  MeleeTargetEvaluation,
  ReachableTile,
  RenderMode,
  ScenarioId,
  TargetEvaluation,
  UnitData,
  WeatherType,
} from "../core/types";

export type { ActionMode };

export type ImpactObstacleKind =
  | "high_wall"
  | "pillar"
  | "low_wall"
  | "palace_wood"
  | "palace_stucco"
  | "cobble";

export interface UnitCombatLoss {
  id: number;
  timestamp: number;
  durationMs: number;
  attackerId: string;
  weaponId: string;
  hit: boolean;
  critical: boolean;
  misfired: boolean;
  hitChance?: number;
  /** Stav zdraví před zásahem a po zásahu */
  hpBefore: number;
  hpAfter: number;
  hpLost: number;
  maxHp: number;
  /** Stav zbroje (kyrysu) před zásahem a po zásahu */
  armorBefore: number;
  armorAfter: number;
  armorLost: number;
  armorAbsorbed: number;
  maxArmor: number;
  /** Ztráta akčních bodů (AP), morálky, hlídky či svobody */
  apLost: number;
  shakenApplied: boolean;
  overwatchLost: boolean;
  detainedApplied: boolean;
  killed: boolean;
  enteredDeathThroes?: boolean;
  instantKilled?: boolean;
}

export interface UnitVisualFX {
  lungeTimestamp: number;
  lungeKind?: "recoil" | "melee";
  hitTimestamp: number;
  coverSettleTimestamp?: number;
  coverSettleDir?: CardinalDir | null;
  floatingBanner: {
    id: number;
    phrase: Phrase;
    tone: "hit" | "crit" | "miss" | "misfire" | "overwatch" | "buff";
  } | null;
  combatLoss?: UnitCombatLoss | null;
}

export interface ProjectileVisual {
  id: number;
  from: GridCoord;
  to: GridCoord;
  targetId?: string;
  hitChance?: number;
  kind: "bullet" | "grenade" | "sniper_beam" | "shrapnel_burst" | "melee_strike";
  createdAt: number;
  durationMs?: number;
  hit?: boolean;
  critical?: boolean;
  misfired?: boolean;
  /** Výsledné zranění do zdraví (HP) pro škálování částic krve a otřesu kamery */
  damage?: number;
  /** Závažnost krvácení: 0 = bez krve, 1 = lehké (1-2 HP), 2 = střední (3-4 HP), 3 = těžké/smrtící (5+ HP) */
  bloodSeverity?: 0 | 1 | 2 | 3;
  /** Počet stržených bodů zbroje */
  armorShredded?: number;
  /** Počet bodů poškození pohlcených zbrojí */
  armorAbsorbed?: number;
  /** Zda cíl po zásahu padl k zemi */
  killed?: boolean;
  /** Typ zasažené překážky při minutí cíle */
  impactObstacle?: ImpactObstacleKind;
  /** Přesná souřadnice dlaždice/překážky, do které narazila zbloudilá kulka při minutí */
  missImpactCoord?: GridCoord;
  extraTargets?: GridCoord[];
  detonatedKegs?: GridCoord[];
}

export interface BlastZoneEvent {
  id: number;
  coord: GridCoord;
  createdAt: number;
  baseRadius: number;
  maxRadius: number;
  isExplosion: boolean;
}

export interface GameStoreState {
  grid: GridSystem;
  units: UnitData[];
  round: number;
  turn: Faction;
  reinforcementsSpawned: boolean;
  reinforcementRound: number;
  weather: WeatherType;
  gridVersion: number;
  smokeVersion: number;
  combatIntensity: number;
  blastZones: BlastZoneEvent[];
  outcome: "ongoing" | "victory" | "defeat";
  victoryReason: "boat_escape" | "annihilation" | "portcullis" | "skiff" | null;
  defeatReason: CaptureReason | null;
  scenario: ScenarioId;
  briefingOpen: boolean;
  m2: Mission2Clock | null;
  m3: Mission3Clock | null;
  /** Oath and the Mission 1 vigil name. Survives scenario resets. */
  campaign: CampaignState;
  oath: { havel: "accept" | "refuse" | "fallen"; ondrej: "accept" | "refuse" | "fallen" } | null;
  isCapturingAnim: boolean;

  selectedUnitId: string | null;
  activeFloor: FloorLevel;
  renderMode: RenderMode;
  cameraStep: number;
  isFullscreen: boolean;

  actionMode: ActionMode;
  breakdownOpen: boolean;
  inspectOpen: boolean;
  inspectKeyHeld: boolean;
  inspectClickConsumed: boolean;
  inspectPin: InspectPin;
  fogOfWarEnabled: boolean;
  preferredFogOfWar: boolean;
  fogSnapshot: FogOfWarSnapshot;
  reachableTiles: Map<string, ReachableTile>;
  hoveredTile: GridCoord | null;
  hoveredPath: GridCoord[];
  hoveredSpottedEnemyIds: string[];
  visibleTargets: TargetEvaluation[];
  visibleMeleeTargets: MeleeTargetEvaluation[];
  selectedTargetId: string | null;

  isBusy: boolean;
  cameraDirector: CameraDirectorState;
  revealedPodEnemyIds: Set<string>;
  activeMovement: {
    unitId: string;
    from: GridCoord;
    path: GridCoord[];
    isActionCam?: boolean;
    interactionKind?: StepInteractionKind;
  } | null;
  activeProjectile: ProjectileVisual | null;
  lightFlashes: ActiveLightFlash[];
  triggerLightFlash: (flash: Omit<ActiveLightFlash, "id" | "createdAt">) => void;
  unitFx: Record<string, UnitVisualFX>;
  combatLog: CombatLogEntry[];

  tutorialStep: 1 | 2 | 3 | 4 | null;
  tutorialDismissed: boolean;
  setTutorialStep: (step: 1 | 2 | 3 | 4 | null) => void;
  advanceTutorialStep: () => void;
  toggleTutorial: () => void;

  guidedTutorial: GuidedTutorialState;
  setGuidedTutorialStep: (step: GuidedTutorialStep) => void;
  skipGuidedTutorial: () => void;
  toggleGuidedTutorial: () => void;
  setGuidedTutorialReject: (msg: Phrase | null) => void;

  sacrificeDilemmaOpen: boolean;
  sacrificedHeroId: string | null;
  ironVigilPerk: { perkId: PerkId; heroId: string } | null;
  chooseSacrifice: (heroId: string) => void;

  demonstratedAbilities: Record<string, boolean>;
  activateSpecialAbility: (unitId?: string) => void;

  actionCamEnabled: boolean;
  toggleActionCam: () => void;
  setActionCamEnabled: (enabled: boolean) => void;

  selectUnit: (unitId: string) => void;
  setActiveFloor: (floor: FloorLevel) => void;
  toggleFloor: () => void;
  toggleFullscreen: () => void;
  setFullscreenState: (fs: boolean) => void;
  setRenderMode: (mode: RenderMode) => void;
  toggleRenderMode: () => void;
  setWeather: (weather: WeatherType) => void;
  cycleWeather: () => void;
  toggleFogOfWar: () => void;
  setFogOfWarEnabled: (enabled: boolean) => void;
  rotateCamera: (dir: 1 | -1) => void;
  setActionMode: (mode: ActionMode) => void;
  toggleBreakdown: () => void;
  beginInspectHold: () => void;
  endInspectHold: () => void;
  cancelInspectHold: () => void;
  closeInspect: () => void;
  selectTarget: (targetId: string) => void;
  cycleTarget: (dir: 1 | -1) => void;
  setHoveredTile: (coord: GridCoord | null) => void;
  previewEnemyMeleeHover: (enemyId: string | null) => void;
  handleTileClick: (coord: GridCoord) => void;
  handleTileRightClick: (coord: GridCoord) => void;
  handleUnitClick: (unitId: string) => void;
  handleUnitRightClick: (unitId: string) => void;
  handleRightClickCancel: () => void;
  completeUnitMovement: () => void;
  executeShoot: (targetId?: string) => void;
  executeReload: () => void;
  executeMelee: (targetId?: string, options?: { freeChainAp?: boolean; rng?: () => number }) => void;
  activateOverwatch: () => void;
  executeGrenade: (targetCoord: GridCoord) => void;
  toggleDoor: (coord: GridCoord) => void;
  endTurn: () => void;
  resetGame: () => void;
  beginScenario: (scenario: "mission1" | "mission2" | "mission3") => void;
  openBriefing: () => void;
  kneelAtInscription: () => void;
  layCordAt: (coord: GridCoord) => void;
  lightMission3Cord: () => void;
  cutMission3Tackle: () => void;
  armMission3Climb: () => void;
  disruptMission3Falconet: () => void;
  unpinWindlassPawl: () => void;
  severPortcullisRope: () => void;
  douseWindlassFire: () => void;
  disruptKeystoneRite: () => void;
  chooseOath: (which: "both" | "havel" | "ondrej" | "neither") => void;
}

export type StoreSet = {
  (
    partial:
      | GameStoreState
      | Partial<GameStoreState>
      | ((state: GameStoreState) => GameStoreState | Partial<GameStoreState>),
  ): void;
};

export type StoreGet = () => GameStoreState;

export type TriggerUnitFxFn = (
  unitId: string,
  patch: Partial<{
    lunge: boolean;
    lungeKind: "recoil" | "melee";
    hit: boolean;
    coverSettle: boolean;
    coverSettleDir: CardinalDir | null;
    banner: {
      phrase: Phrase;
      tone: "hit" | "crit" | "miss" | "misfire" | "overwatch" | "buff";
    };
    loss: UnitCombatLoss | null;
  }>,
) => void;

export interface StoreRuntimeDeps {
  triggerUnitFx: TriggerUnitFxFn;
  animateUnitAlongPath: (
    unitId: string,
    path: GridCoord[],
    opts?: {
      isActionCam?: boolean;
      interactionKind?: StepInteractionKind;
    },
  ) => Promise<void>;
  performPodRevealAndScramble: (
    spotterUnitId: string,
    spotterCoord: GridCoord,
    newlySpottedEnemies: UnitData[],
  ) => Promise<void>;
  performOverwatchReactionsIfAny: (
    movedUnitId: string,
    destCoord: GridCoord,
    movementPath?: GridCoord[],
  ) => Promise<void>;
  playCaptureFinalAnimationAndDefeat: (
    reason: CaptureReason,
    roundNum: number,
  ) => Promise<void>;
  noteMission3Noise: (
    reason: "shot" | "melee" | "blast" | "cord" | "tackle" | "torch",
  ) => void;
}
