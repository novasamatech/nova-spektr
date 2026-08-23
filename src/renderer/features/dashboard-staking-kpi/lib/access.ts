import { type PositionAccess } from '@/features/dashboard-staking-positions';

/**
 * What the user may do with a position — the positions feature owns the
 * definition and the resolution (`getPositionAccess`); this alias keeps the KPI
 * widgets' own vocabulary in one place.
 */
export type Access = PositionAccess;

/**
 * Whether a verdict can start an on-chain action. Re-exported rather than
 * re-implemented: the two dashboard widgets show the _same_ positions, so a
 * second copy of this rule could only ever drift into offering a button on one
 * surface and not the other.
 */
export { canAct } from '@/features/dashboard-staking-positions';
