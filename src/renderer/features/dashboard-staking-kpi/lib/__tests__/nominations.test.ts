import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { buildNominationRows } from '../nominations';

const POLKADOT = '0xpolkadot' as ChainId;
const KUSAMA = '0xkusama' as ChainId;

const CHAIN_NAMES = { [POLKADOT]: 'Polkadot', [KUSAMA]: 'Kusama' } as Record<ChainId, string>;

const account = (index: number) => `0xacc${index}` as AccountId;
const validator = (index: number) => `0xval${index}` as AccountId;

function position(params: {
  accountId: AccountId;
  chainId?: ChainId;
  nominations: AccountId[];
  activeValidators?: AccountId[];
}): StakingPosition {
  return {
    accountId: params.accountId,
    chainId: params.chainId ?? POLKADOT,
    nominations: params.nominations,
    activeValidators: params.activeValidators ?? [],
  } as unknown as StakingPosition;
}

describe('buildNominationRows', () => {
  it('counts how many of the selected accounts nominate each validator', () => {
    const rows = buildNominationRows(
      [
        position({ accountId: account(1), nominations: [validator(1), validator(2)] }),
        position({ accountId: account(2), nominations: [validator(1)] }),
        position({ accountId: account(3), nominations: [validator(1)] }),
      ],
      CHAIN_NAMES,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ validatorId: validator(1), nominatorCount: 3 });
    expect(rows[1]).toMatchObject({ validatorId: validator(2), nominatorCount: 1 });
  });

  it('puts the most-nominated validator first — concentration is the point', () => {
    const rows = buildNominationRows(
      [
        position({ accountId: account(1), nominations: [validator(9)] }),
        position({ accountId: account(2), nominations: [validator(9), validator(8)] }),
        position({ accountId: account(3), nominations: [validator(8)] }),
        position({ accountId: account(4), nominations: [validator(8)] }),
      ],
      CHAIN_NAMES,
    );

    expect(rows.map((row) => row.validatorId)).toEqual([validator(8), validator(9)]);
  });

  it('separates the same validator key on two chains', () => {
    // One key elected on both networks is two validators: two nomination sets,
    // two rewards.
    const rows = buildNominationRows(
      [
        position({ accountId: account(1), chainId: POLKADOT, nominations: [validator(1)] }),
        position({ accountId: account(2), chainId: KUSAMA, nominations: [validator(1)] }),
      ],
      CHAIN_NAMES,
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.chainName).sort()).toEqual(['Kusama', 'Polkadot']);
    expect(rows.every((row) => row.nominatorCount === 1)).toBe(true);
  });

  it('separates nominating from actually being backed', () => {
    const rows = buildNominationRows(
      [
        position({ accountId: account(1), nominations: [validator(1)], activeValidators: [validator(1)] }),
        position({ accountId: account(2), nominations: [validator(1)], activeValidators: [] }),
      ],
      CHAIN_NAMES,
    );

    expect(rows[0]).toMatchObject({ nominatorCount: 2, activeCount: 1 });
  });

  it('records which accounts stand behind a validator', () => {
    const rows = buildNominationRows(
      [
        position({ accountId: account(1), nominations: [validator(1)] }),
        position({ accountId: account(2), nominations: [validator(1)] }),
      ],
      CHAIN_NAMES,
    );

    expect(rows[0]?.accountIds).toEqual([account(1), account(2)]);
  });

  it('counts an account once even if its nomination list repeats a target', () => {
    const rows = buildNominationRows(
      [position({ accountId: account(1), nominations: [validator(1), validator(1)] })],
      CHAIN_NAMES,
    );

    expect(rows[0]?.nominatorCount).toBe(1);
  });

  it('has nothing to show for a selection that nominates nothing', () => {
    expect(buildNominationRows([position({ accountId: account(1), nominations: [] })], CHAIN_NAMES)).toEqual([]);
    expect(buildNominationRows([], CHAIN_NAMES)).toEqual([]);
  });
});
