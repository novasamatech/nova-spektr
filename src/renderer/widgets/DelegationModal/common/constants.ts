import { type DelegateStat } from '@/shared/api/governance/off-chain/lib/types';

export const enum SortType {
  DELEGATIONS = 'delegations',
  VOTED = 'voted',
  VOTES = 'votes',
}

export const SortProp: Record<SortType, keyof DelegateStat> = {
  [SortType.DELEGATIONS]: 'delegators',
  [SortType.VOTED]: 'delegateVotesMonth',
  [SortType.VOTES]: 'delegatorVotes',
};

export const NOVASAMA_DELEGATE_REGISTRY = 'https://docs.novawallet.io/nova-wallet-wiki/opengov/delegate-registry';

export const enum DelegationErrors {
  INVALID_ADDRESS = 'invalidAddress',
  ALREADY_DELEGATED = 'alreadyDelegated',
  YOUR_ACCOUNT = 'yourAccount',
}

export const DelegationErrorMessages: Record<DelegationErrors, string> = {
  [DelegationErrors.INVALID_ADDRESS]: 'governance.addDelegation.invalidAddressError',
  [DelegationErrors.ALREADY_DELEGATED]: 'governance.addDelegation.alreadyDelegatedError',
  [DelegationErrors.YOUR_ACCOUNT]: 'governance.addDelegation.yourAccountError',
};
