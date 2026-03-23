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

export function formatEndDate(ms: number): string {
  const daysAgo = Math.floor((Date.now() - ms) / DAY);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return '1d ago';
  if (daysAgo < 30) return `${daysAgo}d ago`;

  return new Date(ms).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
