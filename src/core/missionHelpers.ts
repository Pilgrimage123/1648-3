/**
 * Shared unit & tile builders for scenario modules (mission2.ts, mission3.ts).
 */
import type { GridSystem } from "./GridSystem";
import type { FloorLevel, GridCoord, TileData, UnitData } from "./types";

export function paintScenarioTile(
  grid: GridSystem,
  x: number,
  y: FloorLevel,
  z: number,
  surface: TileData["surface"],
  walkable: boolean,
  clearObstacle = false,
): void {
  const coord: GridCoord = { x, y, z };
  grid.setFloor(coord, true, surface);
  const tile = grid.getTile(coord);
  if (!tile) return;
  tile.surface = surface;
  if (clearObstacle) {
    tile.obstacle = "none";
    tile.isEscapeZone = false;
    tile.walkable = walkable;
  } else {
    tile.walkable = walkable && tile.obstacle === "none";
  }
}

export type BaseScenarioUnitInput = Pick<
  UnitData,
  | "id"
  | "name"
  | "roleTitle"
  | "faction"
  | "archetype"
  | "pos"
  | "facing"
  | "hp"
  | "armor"
  | "movePerAp"
> & {
  weapon: UnitData["weapon"];
  melee?: UnitData["meleeWeapon"];
  isVip?: boolean;
  attachedToCart?: boolean;
};

export function makeScenarioUnit(partial: BaseScenarioUnitInput): UnitData {
  return {
    id: partial.id,
    name: partial.name,
    roleTitle: partial.roleTitle,
    faction: partial.faction,
    archetype: partial.archetype,
    isVip: partial.isVip,
    pos: partial.pos,
    facing: partial.facing,
    hp: partial.hp,
    maxHp: partial.hp,
    armor: partial.armor,
    maxArmor: partial.armor,
    ap: 2,
    maxAp: 2,
    marksmanship: partial.faction === "player" ? 70 : 48,
    movePerAp: partial.movePerAp,
    baseMovePerAp: partial.movePerAp,
    weapon: partial.weapon,
    meleeWeapon: partial.melee,
    pistolLoaded: true,
    firearmLoaded: true,
    reloadProgress: 0,
    grenades: 0,
    isOverwatch: false,
    movedThisTurn: false,
    isShaken: false,
    alive: true,
    attachedToCart: partial.attachedToCart,
  };
}
