import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidatorMap, type ExposureMap, type StakingPosition } from '@/domains/staking';
import { buildSpreadRows, toAllocationRows } from '../spread';

const POLKADOT = '0xpolkadot' as ChainId;
const KUSAMA = '0xkusama' as ChainId;

const account = (index: number) => `0xacc${index}` as AccountId;
const validator = (index: number) => `0xval${index}` as AccountId;

const META = {
  [POLKADOT]: { chainName: 'Polkadot', symbol: 'DOT', precision: 10 },
  [KUSAMA]: { chainName: 'Kusama', symbol: 'KSM', precision: 12 },
} as Record<ChainId, { chainName: string; symbol: string; precision: number }>;

function position(params: {
  accountId: AccountId;
  chainId?: ChainId;
  nominations: AccountId[];
  activeValidators?: AccountId[];
  total?: string;
  active?: string;
}): StakingPosition {
  const total = params.total ?? '1000';

  return {
    accountId: params.accountId,
    chainId: params.chainId ?? POLKADOT,
    nominations: params.nominations,
    activeValidators: params.activeValidators ?? [],
    stake: { stash: params.accountId, total, active: params.active ?? total },
  } as unknown as StakingPosition;
}

function exposures(
  entries: Record<string, { who: AccountId; value: string }[]>,
  chainId: ChainId = POLKADOT,
): Record<ChainId, ExposureMap> {
  const map: ExposureMap = {};
  for (const [validatorId, others] of Object.entries(entries)) {
    map[validatorId as AccountId] = { total: '0', own: '0', nominatorCount: others.length, pageCount: 1, others };
  }

  return { [chainId]: map } as Record<ChainId, ExposureMap>;
}

function elected(validatorIds: AccountId[], chainId: ChainId = POLKADOT): Record<ChainId, EraValidatorMap> {
  const map: EraValidatorMap = {};
  for (const validatorId of validatorIds) {
    map[validatorId] = { accountId: validatorId, elected: true } as EraValidatorMap[AccountId];
  }

  return { [chainId]: map } as Record<ChainId, EraValidatorMap>;
}

const NO_VALIDATORS = {} as Record<ChainId, EraValidatorMap>;

describe('buildSpreadRows', () => {
  it('takes the amount the era actually put behind each validator', () => {
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), nominations: [validator(1), validator(2)] })],
      exposuresByChain: exposures({
        [validator(1)]: [{ who: account(1), value: '600' }],
        [validator(2)]: [{ who: account(1), value: '400' }],
      }),
      eraValidatorsByChain: NO_VALIDATORS,
      metaByChain: META,
    });

    expect(rows.map((row) => row.allocated)).toEqual(['600', '400']);
    expect(rows[0]).toMatchObject({ validatorId: validator(1), accountId: account(1), positionTotal: '1000' });
  });

  it('ignores nominators other than the account itself', () => {
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), nominations: [validator(1)] })],
      exposuresByChain: exposures({
        [validator(1)]: [
          { who: account(2), value: '999' },
          { who: account(1), value: '10' },
        ],
      }),
      eraValidatorsByChain: NO_VALIDATORS,
      metaByChain: META,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.allocated).toBe('10');
  });

  it('separates a validator that pays nothing from one that was never elected', () => {
    const rows = buildSpreadRows({
      positions: [
        position({
          accountId: account(1),
          nominations: [validator(1), validator(2), validator(3)],
          activeValidators: [validator(1)],
        }),
      ],
      exposuresByChain: exposures({ [validator(1)]: [{ who: account(1), value: '600' }] }),
      eraValidatorsByChain: elected([validator(1), validator(2)]),
      metaByChain: META,
    });

    expect(rows.map((row) => [row.validatorId, row.status, row.allocated])).toEqual([
      [validator(1), 'active', '600'],
      [validator(2), 'droppedOut', '0'],
      [validator(3), 'waiting', '0'],
    ]);
  });

  it('calls nothing dropped out while the era validator set is unknown', () => {
    // Without the elected set there is no proof a validator dropped us: an
    // accusation the data does not support is worse than no answer.
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), nominations: [validator(1)] })],
      exposuresByChain: exposures({}),
      eraValidatorsByChain: NO_VALIDATORS,
      metaByChain: META,
    });

    expect(rows[0]?.status).toBe('waiting');
  });

  it('leaves the amount unknown when an active validator page has not been read', () => {
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), nominations: [validator(1)], activeValidators: [validator(1)] })],
      exposuresByChain: exposures({}),
      eraValidatorsByChain: elected([validator(1)]),
      metaByChain: META,
    });

    expect(rows[0]).toMatchObject({ status: 'active', allocated: null });
  });

  it('skips a chain whose exposures have not been read at all', () => {
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), chainId: KUSAMA, nominations: [validator(1)] })],
      exposuresByChain: exposures({ [validator(1)]: [{ who: account(1), value: '600' }] }),
      eraValidatorsByChain: NO_VALIDATORS,
      metaByChain: META,
    });

    expect(rows).toEqual([]);
  });

  it('skips a chain with no metadata rather than showing a nameless row', () => {
    const rows = buildSpreadRows({
      positions: [position({ accountId: account(1), nominations: [validator(1)] })],
      exposuresByChain: exposures({ [validator(1)]: [{ who: account(1), value: '600' }] }),
      eraValidatorsByChain: NO_VALIDATORS,
      metaByChain: {},
    });

    expect(rows).toEqual([]);
  });

  it('groups accounts largest position first, active nominations on top', () => {
    const rows = buildSpreadRows({
      positions: [
        position({ accountId: account(1), nominations: [validator(1)], total: '100' }),
        position({
          accountId: account(2),
          nominations: [validator(2), validator(3)],
          activeValidators: [validator(3)],
          total: '900',
        }),
      ],
      exposuresByChain: exposures({
        [validator(1)]: [{ who: account(1), value: '100' }],
        [validator(3)]: [{ who: account(2), value: '900' }],
      }),
      eraValidatorsByChain: elected([validator(2), validator(3)]),
      metaByChain: META,
    });

    expect(rows.map((row) => [row.accountId, row.validatorId])).toEqual([
      [account(2), validator(3)],
      [account(2), validator(2)],
      [account(1), validator(1)],
    ]);
  });
});

describe('toAllocationRows', () => {
  it('keeps only the pairs the era pays with a known amount', () => {
    const rows = buildSpreadRows({
      positions: [
        position({
          accountId: account(1),
          nominations: [validator(1), validator(2), validator(3)],
          activeValidators: [validator(1), validator(3)],
        }),
      ],
      exposuresByChain: exposures({ [validator(1)]: [{ who: account(1), value: '600' }] }),
      eraValidatorsByChain: elected([validator(1), validator(2), validator(3)]),
      metaByChain: META,
    });

    // validator(3) is active but its page is unread — an unknown amount must not
    // reach an export as a zero.
    expect(toAllocationRows(rows).map((row) => [row.validatorId, row.allocated])).toEqual([[validator(1), '600']]);
  });
});
