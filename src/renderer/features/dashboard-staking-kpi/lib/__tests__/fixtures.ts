import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';

export const POLKADOT = '0xpolkadot' as ChainId;
export const KUSAMA = '0xkusama' as ChainId;

export const ALICE = '0xalice' as AccountId;
export const BOB = '0xbob' as AccountId;

type PositionOverrides = Partial<Omit<StakingPosition, 'stake'>> & {
  active?: string;
  total?: string;
};

export function makePosition({
  accountId = ALICE,
  chainId = POLKADOT,
  status = 'active',
  active = '1000',
  total = '1000',
  activeValidators = [],
  nominations = [],
  unbonding = [],
  redeemable = '0',
  totalUnbonding = '0',
  statusReason = null,
  payee = null,
  payeeLoaded = false,
}: PositionOverrides = {}): StakingPosition {
  return {
    accountId,
    chainId,
    status,
    statusReason,
    kind: 'nominator',
    validator: null,
    nominations,
    activeValidators,
    unbonding,
    redeemable,
    totalUnbonding,
    payee,
    payeeLoaded,
    stake: {
      accountId,
      chainId,
      controller: accountId,
      stash: accountId,
      active,
      total,
      unlocking: [],
    },
  };
}
