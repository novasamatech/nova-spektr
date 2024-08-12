import { type DelegateStat } from '@/shared/api/governance/off-chain/lib/types';

export const enum SortType {
  DELEGATIONS = 'delegations',
  VOTED = 'voted',
  VOTES = 'votes',
}

export const SortProp: Record<SortType, keyof DelegateStat> = {
  [SortType.DELEGATIONS]: 'delegators',
  [SortType.VOTED]: 'delegateVotes',
  [SortType.VOTES]: 'delegatorVotes',
};
