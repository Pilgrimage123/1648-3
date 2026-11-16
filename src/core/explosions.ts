/**
 * Powder-keg blasts shared by the store and Mission 3's cook-off.
 * The store keeps the shockwave. The cook-off turns it off and clips the yard.
 */
import { isInstantOverkill } from "./CombatSystem";
import { coordKey, GridSystem } from "./GridSystem";
import type { GridCoord, TileData, UnitData, WeatherType } from "./types";

export interface PowderBlastOptions {
  damage?: number;
  armorShred?: number;
  /** ADR-0011 ring. Cook-off passes false and writes its own smoke. */
  shockwave?: boolean;
  weather?: WeatherType;
  /** Return false to leave the tile, its keg, and anyone standing on it alone. */
  clip?: (coord: GridCoord, tile: TileData) => boolean;
}

export interface PowderBlastResult {
  nextUnits: UnitData[];
  detonatedKegs: GridCoord[];
  victims: string[];
}

function deathThroesTurnsAfterHit(unit: UnitData, inThroes: boolean): number {
  if (!inThroes) return 0;
  if (unit.inDeathThroes) return unit.deathThroesTurns ?? 1;
  return 1;
}

function clipAllows(
  grid: GridSystem,
  coord: GridCoord,
  clip: PowderBlastOptions["clip"],
): TileData | null {
  const tile = grid.getTile(coord);
  if (!tile) return null;
  if (clip && !clip(coord, tile)) return null;
  return tile;
}

/**
 * One blast center, then every keg in its Chebyshev-1 ring, the same loop the
 * store used to keep in `processExplosions`.
 */
export function applyPowderBlast(
  grid: GridSystem,
  units: UnitData[],
  blastCoord: GridCoord,
  options: PowderBlastOptions = {},
): PowderBlastResult {
  const damage = options.damage ?? 5;
  const armorShred = options.armorShred ?? 2;
  const shockwave = options.shockwave !== false;
  const weather = options.weather ?? "clear";
  const clip = options.clip;

  const detonatedKegs: GridCoord[] = [];
  const victims: string[] = [];
  const queue: GridCoord[] = [blastCoord];
  const visitedKegs = new Set<string>();

  let currentUnits = [...units];

  while (queue.length > 0) {
    const center = queue.shift()!;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c: GridCoord = {
          x: center.x + dx,
          y: center.y,
          z: center.z + dz,
        };
        const tile = clipAllows(grid, c, clip);
        if (!tile) continue;

        if (tile.obstacle === "powder_keg") {
          const key = coordKey(c);
          if (!visitedKegs.has(key)) {
            visitedKegs.add(key);
            grid.setObstacle(c, "none");
            detonatedKegs.push(c);
            queue.push(c);
          }
        } else if (tile.obstacle === "low_wall") {
          grid.setObstacle(c, "none");
        }
        grid.damageTile(c, 2);
      }
    }

    if (shockwave) {
      grid.applyExplosionShockwave(center, 1, weather);
    }

    currentUnits = currentUnits.map((u) => {
      if (!u.alive) return u;
      const inBlast =
        u.pos.y === center.y &&
        Math.abs(u.pos.x - center.x) <= 1 &&
        Math.abs(u.pos.z - center.z) <= 1;
      if (!inBlast) return u;
      if (clip) {
        const stood = grid.getTile(u.pos);
        if (!stood || !clip(u.pos, stood)) return u;
      }

      if (!victims.includes(u.id)) victims.push(u.id);
      const nextArmor = Math.max(0, u.armor - armorShred);
      const nextHp = u.hp - damage;
      const instantKilled = isInstantOverkill(nextHp, u.maxHp);
      const inThroes = !instantKilled && nextHp <= 0;
      return {
        ...u,
        armor: nextArmor,
        hp: nextHp,
        isShaken: nextHp > 0,
        alive: !instantKilled,
        inDeathThroes: inThroes,
        deathThroesTurns: deathThroesTurnsAfterHit(u, inThroes),
        isOverwatch: nextHp > 0 ? u.isOverwatch : false,
      };
    });
  }

  grid.bakeCoverFromObstacles();

  return { nextUnits: currentUnits, detonatedKegs, victims };
}
