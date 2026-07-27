import { describe, expect, it } from 'vitest';

import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator, type EraValidatorMap, type ExposureMap } from '@/domains/staking';
import { buildNominationRows, countNominations } from '../nominations';

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const STASH = accountId(99);
const A = accountId(1);
const B = accountId(2);
const C = accountId(3);
const D = accountId(4);

function eraValidator(overrides: Partial<EraValidator> = {}): EraValidator {
  return {
    accountId: A,
    totalStake: '1000',
    ownStake: '100',
    commission: 5,
    blocked: false,
    nominatorCount: 10,
    pageCount: 1,
    maxNominatorsRewarded: 512,
    oversubscribed: false,
    slashed: false,
    eraPoints: 120,
    blocksAuthored: null,
    apy: 14,
    elected: true,
    ...overrides,
  };
}

describe('buildNominationRows', () => {
  const eraValidators: EraValidatorMap = {
    [A]: eraValidator({ accountId: A, commission: 3, apy: 15, eraPoints: 200 }),
    [B]: eraValidator({ accountId: B, commission: 7, apy: 11, eraPoints: 50 }),
    [C]: eraValidator({ accountId: C }),
  };

  const exposures: ExposureMap = {
    [A]: { total: '1000', own: '100', nominatorCount: 2, pageCount: 1, others: [{ who: STASH, value: '250' }] },
    [B]: { total: '900', own: '90', nominatorCount: 1, pageCount: 1, others: [{ who: accountId(50), value: '10' }] },
  };

  it('separates "not elected" from "elected but dropped us"', () => {
    const rows = buildNominationRows({
      stash: STASH,
      nominations: [A, B, D],
      activeValidators: [A],
      eraValidators,
      exposures,
    });

    expect(rows.map((row) => row.status)).toEqual(['active', 'droppedOut', 'waiting']);
  });

  it('reads our slice of the exposure page', () => {
    const rows = buildNominationRows({
      stash: STASH,
      nominations: [A, B],
      activeValidators: [A],
      eraValidators,
      exposures,
    });

    expect(rows[0]?.ourStake).toEqual('250');
    expect(rows[1]?.ourStake).toBeNull();
  });

  it('carries commission, apy and era points from the era set', () => {
    const [row] = buildNominationRows({
      stash: STASH,
      nominations: [A],
      activeValidators: [A],
      eraValidators,
      exposures,
    });

    expect(row).toMatchObject({ commission: 3, apy: 15, eraPoints: 200 });
  });

  it('leaves per-validator figures null when the validator is unknown', () => {
    const [row] = buildNominationRows({
      stash: STASH,
      nominations: [D],
      activeValidators: [],
      eraValidators,
      exposures,
    });

    expect(row).toMatchObject({ commission: null, apy: null, eraPoints: null, ourStake: null });
  });

  it('never claims a nomination dropped out while the era set is unknown', () => {
    const rows = buildNominationRows({
      stash: STASH,
      nominations: [A, B, C],
      activeValidators: [A],
      eraValidators: null,
      exposures: {},
    });

    expect(rows.map((row) => row.status)).toEqual(['active', 'waiting', 'waiting']);
  });
});

describe('countNominations', () => {
  it('produces the footer counts', () => {
    const eraValidators: EraValidatorMap = {};
    const nominations = Array.from({ length: 16 }, (_, index) => accountId(index + 1));

    for (const id of nominations.slice(0, 15)) {
      eraValidators[id] = eraValidator({ accountId: id });
    }

    // 12 active, 3 elected-but-dropped, 1 not elected.
    const rows = buildNominationRows({
      stash: STASH,
      nominations,
      activeValidators: nominations.slice(0, 12),
      eraValidators,
      exposures: {},
    });

    expect(countNominations(rows)).toEqual({ total: 16, active: 12, waiting: 1, droppedOut: 3 });
  });

  it('counts an empty set as all zeros', () => {
    expect(countNominations([])).toEqual({ total: 0, active: 0, waiting: 0, droppedOut: 0 });
  });
});
