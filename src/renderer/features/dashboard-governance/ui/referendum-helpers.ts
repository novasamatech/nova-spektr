import { type TFunction } from 'i18next';

import { type EndedReferendum } from '../hooks/useEndedReferendums';

const DAY = 86_400_000;

export const OUTCOME_STYLES: Record<EndedReferendum['outcome'], string> = {
  Approved: 'bg-text-positive/10 text-text-positive',
  Rejected: 'bg-text-negative/10 text-text-negative',
  Cancelled: 'bg-text-tertiary/10 text-text-tertiary',
  TimedOut: 'bg-text-tertiary/10 text-text-tertiary',
  Killed: 'bg-text-tertiary/10 text-text-tertiary',
};

export const OUTCOME_I18N_KEY: Record<EndedReferendum['outcome'], string> = {
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
  TimedOut: 'timedOut',
  Killed: 'killed',
};

export function formatEndDate(ms: number, t: TFunction): string {
  const daysAgo = Math.floor((Date.now() - ms) / DAY);
  if (daysAgo === 0) return t('dashboard.referendums.time.today');
  if (daysAgo === 1) return t('dashboard.referendums.time.daysAgo', { count: 1 });
  if (daysAgo < 30) return t('dashboard.referendums.time.daysAgo', { count: daysAgo });

  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
