/**
 * Coordinate conversion utilities between discrete 3D GridCoord { x, y, z }
 * and Three.js world space [wx, wy, wz].
 */

import { GRID_DEPTH, GRID_WIDTH } from "../../core/GridSystem";
import type { GridCoord } from "../../core/types";

export const TILE_SIZE = 1.6;
export const FLOOR_HEIGHT = 2.4;

export function gridToWorld(coord: GridCoord): [number, number, number] {
  return continuousGridToWorld(coord.x, coord.y, coord.z);
}

/**
 * Continuous / floating-point coordinate conversion to 3D world space.
 * Prevents `as any` type assertions for fractional sub-grid entities (e.g. boats, mist patches).
 */
export function continuousGridToWorld(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const wx = (x - (GRID_WIDTH - 1) * 0.5) * TILE_SIZE;
  const wy = y * FLOOR_HEIGHT;
  const wz = (z - (GRID_DEPTH - 1) * 0.5) * TILE_SIZE;
  return [wx, wy, wz];
}

export function worldToContinuousGridXZ(wx: number, wz: number): [number, number] {
  const gx = wx / TILE_SIZE + (GRID_WIDTH - 1) * 0.5;
  const gz = wz / TILE_SIZE + (GRID_DEPTH - 1) * 0.5;
  return [gx, gz];
}

export function worldToGridXZ(wx: number, wz: number): { x: number; z: number } {
  const [gx, gz] = worldToContinuousGridXZ(wx, wz);
  return { x: Math.round(gx), z: Math.round(gz) };
}
