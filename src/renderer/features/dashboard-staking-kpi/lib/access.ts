import { type PositionAccessMode } from '@/features/dashboard-staking-positions';

/**
 * How the user can act on a position — the positions feature owns the
 * definition and the resolution (`getAccessMode`); this alias keeps the KPI
 * widgets' own vocabulary in one place.
 */
export type AccessMode = PositionAccessMode;

/**
 * Whether a mode can start an on-chain action. Re-exported rather than
 * re-implemented: the two dashboard widgets show the _same_ positions, so a
 * second copy of this rule could only ever drift into offering a button on one
 * surface and not the other.
 */
export { canAct } from '@/features/dashboard-staking-positions';
