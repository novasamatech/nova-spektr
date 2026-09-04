import { type ClaimAction } from '@/shared/api/governance';

import { type Delegation } from './summarizeAccountLocks';

/**
 * Revoking a delegation leaves the balance locked for the conviction period —
 * except with no conviction, where the lock expires in the same block, so an
 * `unlock` in the same batch hands the balance straight back. Undelegates go
 * first: the unlock must see the delegation already gone.
 */
export function buildUndelegateActions(delegations: Delegation[]): ClaimAction[] {
  const undelegates: ClaimAction[] = delegations.map(({ trackId }) => ({ type: 'undelegate', trackId }));
  const unlocks: ClaimAction[] = delegations
    .filter(({ conviction }) => conviction === 'None')
    .map(({ trackId }) => ({ type: 'unlock', trackId }));

  return [...undelegates, ...unlocks];
}
