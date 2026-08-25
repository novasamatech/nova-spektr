import { type PositionAccess } from '@/features/dashboard-staking-positions';

/**
 * What the user may do with a position — the positions feature owns the
 * definition and the resolution (`getPositionAccess`); this alias keeps the KPI
 * widgets' own vocabulary in one place.
 */
export type Access = PositionAccess;
