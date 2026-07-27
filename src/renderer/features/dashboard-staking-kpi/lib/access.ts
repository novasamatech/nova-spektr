import { type PositionAccessMode } from '@/features/dashboard-staking-positions';

/**
 * How the user can act on a position — the positions feature owns the
 * definition and the resolution (`getAccessMode`); this alias exists so the
 * pure helpers below stay free of that feature's runtime graph.
 */
export type AccessMode = PositionAccessMode;

/**
 * Whether a mode can start an on-chain action. A mode that cannot gets **no
 * button at all** — a permanently greyed-out control reads as a bug.
 */
export function canAct(mode: AccessMode): boolean {
  return mode !== 'watchOnly';
}
