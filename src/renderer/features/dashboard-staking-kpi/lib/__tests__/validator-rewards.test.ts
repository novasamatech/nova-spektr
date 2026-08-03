import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayout } from '@/domains/staking';
import { type ChainEraReward } from '../../hooks/useValidatorRewards';
import { type ClaimRow } from '../types';
import { buildValidatorRewardRows, isRowClaimable, toClaimRequests } from '../validator-rewards';

const POLKADOT = '0xpolkadot' as ChainId;
const SIGNABLE = new Set([POLKADOT]);
const NONE = new Set<ChainId>();

const account = (index: number) => `0xacc${index}` as AccountId;
const validator = (index: number) => `0xval${index}` as AccountId;

const toFiat = (_chainId: ChainId, planck: string) => planck;

function payout(era: number, validatorIndex: number, page = 0, amount = '100'): UnclaimedPayout {
  return { era, validator: validator(validatorIndex), page, amount };
}

function claimRow(params: Partial<ClaimRow> & { accountId: AccountId }): ClaimRow {
  return {
    key: `${POLKADOT}:${params.accountId}`,
    chainId: POLKADOT,
    chainName: 'Polkadot',
    symbol: 'DOT',
    precision: 10,
    earned: '0',
    unclaimed: '0',
    unclaimedFiat: '0',
    eras: [],
    payouts: [],
    accessMode: 'direct',
    ...params,
  } as ClaimRow;
}

function reward(validatorIndex: number, accountId: AccountId, amount: string, era = 1): ChainEraReward {
  return { era, validator: validator(validatorIndex), accountId, amount, isSelf: false, chainId: POLKADOT };
}

describe('buildValidatorRewardRows', () => {
  it('sends one call for a validator two of our accounts share in the same era', () => {
    // The chain pays every nominator of the page at once, so a second call for
    // the same (validator, era, page) would be rejected as already claimed.
    const rows = buildValidatorRewardRows({
      claimRows: [
        claimRow({ accountId: account(1), payouts: [payout(10, 1, 0, '60')] }),
        claimRow({ accountId: account(2), payouts: [payout(10, 1, 0, '40')] }),
      ],
      rewards: [],
      toFiat,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.payouts).toHaveLength(1);
    expect(rows[0]?.nominators).toEqual([account(1), account(2)]);
  });

  it('still adds up what both accounts are owed', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [
        claimRow({ accountId: account(1), payouts: [payout(10, 1, 0, '60')] }),
        claimRow({ accountId: account(2), payouts: [payout(10, 1, 0, '40')] }),
      ],
      rewards: [],
      toFiat,
    });

    expect(rows[0]?.unclaimed).toBe('100');
  });

  it('keeps separate pages of one era apart', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), payouts: [payout(10, 1, 0), payout(10, 1, 1)] })],
      rewards: [],
      toFiat,
    });

    expect(rows[0]?.payouts).toHaveLength(2);
    expect(rows[0]?.eras).toEqual([10]);
  });

  it('is claimable on a chain we can sign on, whoever the nominator is', () => {
    // The payout names the validator and is permissionless, so an address-book
    // nominator's rewards are ours to collect for them.
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), accessMode: 'draft', payouts: [payout(10, 1)] })],
      rewards: [],
      toFiat,
    });

    expect(isRowClaimable(rows[0]!, SIGNABLE)).toBe(true);
  });

  it('is not claimable on a network we hold no key for', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), payouts: [payout(10, 1)] })],
      rewards: [],
      toFiat,
    });

    expect(rows).toHaveLength(1);
    expect(isRowClaimable(rows[0]!, NONE)).toBe(false);
  });

  it('sums attributed rewards per validator across our accounts', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1) }), claimRow({ accountId: account(2) })],
      rewards: [reward(1, account(1), '30', 10), reward(1, account(2), '20', 10), reward(1, account(1), '50', 11)],
      toFiat,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ accrued: '100', nominators: [account(1), account(2)] });
  });

  it('shows a validator that earned but owes nothing', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1) })],
      rewards: [reward(7, account(1), '5')],
      toFiat,
    });

    expect(rows[0]).toMatchObject({ validatorId: validator(7), accrued: '5', unclaimed: '0' });
    expect(isRowClaimable(rows[0]!, SIGNABLE)).toBe(false);
  });

  it('puts what can be acted on first', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), payouts: [payout(10, 2, 0, '5')] })],
      rewards: [reward(1, account(1), '900')],
      toFiat,
    });

    expect(rows.map((row) => row.validatorId)).toEqual([validator(2), validator(1)]);
  });

  it('drops a chain it has no asset metadata for', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [],
      rewards: [reward(1, account(1), '10')],
      toFiat,
    });

    expect(rows).toEqual([]);
  });
});

describe('toClaimRequests', () => {
  it('groups every claimable validator into one request per chain', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), payouts: [payout(10, 1), payout(11, 2)] })],
      rewards: [],
      toFiat,
    });

    const requests = toClaimRequests(rows, SIGNABLE);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.chainId).toBe(POLKADOT);
    expect(requests[0]?.payouts).toHaveLength(2);
  });

  it('carries the nominators as the preferred payers', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [
        claimRow({ accountId: account(1), payouts: [payout(10, 1)] }),
        claimRow({ accountId: account(2), payouts: [payout(11, 1)] }),
      ],
      rewards: [],
      toFiat,
    });

    expect(toClaimRequests(rows, SIGNABLE)[0]?.nominators).toEqual([account(1), account(2)]);
  });

  it('leaves out a chain we cannot sign on', () => {
    const rows = buildValidatorRewardRows({
      claimRows: [claimRow({ accountId: account(1), payouts: [payout(10, 1)] })],
      rewards: [],
      toFiat,
    });

    expect(toClaimRequests(rows, NONE)).toEqual([]);
  });
});
