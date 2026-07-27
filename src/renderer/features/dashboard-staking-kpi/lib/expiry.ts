import { type LabelVariant } from '@/shared/ui-kit';

/**
 * A staking payout can only be claimed for the last `HistoryDepth` eras — 84 on
 * both Polkadot and Kusama. Once an era falls out of that window the reward is
 * gone for good, which is why the KPI card shows an expiry countdown rather
 * than a plain amount.
 */
export const CLAIM_WINDOW_ERAS = 84;

export type ExpiryUrgency = 'critical' | 'warning' | 'safe';

/**
 * Red under two weeks, amber up to a month, green beyond. The bands are wide on
 * purpose: an era is roughly a day, so a one-era rounding error never moves a
 * chip across a band.
 */
export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_CRITICAL_DAYS = 14;

export function getExpiryUrgency(daysLeft: number): ExpiryUrgency {
  if (daysLeft < EXPIRY_CRITICAL_DAYS) return 'critical';
  if (daysLeft <= EXPIRY_WARNING_DAYS) return 'warning';

  return 'safe';
}

export const EXPIRY_LABEL_VARIANT: Record<ExpiryUrgency, LabelVariant> = {
  critical: 'red',
  warning: 'orange',
  safe: 'green',
};

/** Eras left before `payoutEra` drops out of the claim window. Never negative. */
export function erasUntilExpiry(payoutEra: number, activeEra: number): number {
  return Math.max(0, CLAIM_WINDOW_ERAS - (activeEra - payoutEra));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Eras converted to days through the chain's era duration. Falls back to one
 * era per day when the duration is unknown — the Polkadot/Kusama reality and a
 * far better guess than showing nothing.
 */
export function daysUntilExpiry(erasLeft: number, eraDurationMs: number | null): number {
  const duration = eraDurationMs && eraDurationMs > 0 ? eraDurationMs : DAY_MS;

  return Math.max(0, Math.floor((erasLeft * duration) / DAY_MS));
}

/**
 * The soonest expiry across a set of payout eras — the one the chip has to warn
 * about. `null` when there is nothing unclaimed.
 */
export function oldestPayoutEra(eras: number[]): number | null {
  if (eras.length === 0) return null;

  return Math.min(...eras);
}
