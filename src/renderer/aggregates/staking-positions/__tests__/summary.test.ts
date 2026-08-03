import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { summarizePositions } from '../lib/summary';

const POLKADOT = '0xpolkadot' as ChainId;
const KUSAMA = '0xkusama' as ChainId;

const ALICE = '0xalice' as AccountId;
const BOB = '0xbob' as AccountId;

const VAL_A = '0xvalA' as AccountId;
const VAL_B = '0xvalB' as AccountId;

type PositionOverrides = Partial<Omit<StakingPosition, 'stake'>> & { total?: string };

function makePosition({
  accountId = ALICE,
  chainId = POLKADOT,
  status = 'active',
  total = '1000',
  activeValidators = [],
  nominations = [],
  unbonding = [],
  redeemable = '0',
  totalUnbonding = '0',
  statusReason = null,
}: PositionOverrides = {}): StakingPosition {
  return {
    accountId,
    chainId,
    status,
    statusReason,
    nominations,
    activeValidators,
    unbonding,
    redeemable,
    totalUnbonding,
    stake: { accountId, chainId, controller: accountId, stash: accountId, active: total, total, unlocking: [] },
  };
}

describe('summarizePositions', () => {
  test('planck is summed per chain and never across assets', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, total: '100', redeemable: '10', totalUnbonding: '20' }),
      makePosition({ chainId: POLKADOT, accountId: BOB, total: '50' }),
      makePosition({ chainId: KUSAMA, total: '7' }),
    ]);

    expect(summary.byChain[POLKADOT]?.totalStaked).toBe('150');
    expect(summary.byChain[POLKADOT]?.redeemable).toBe('10');
    expect(summary.byChain[POLKADOT]?.totalUnbonding).toBe('20');
    expect(summary.byChain[KUSAMA]?.totalStaked).toBe('7');
    expect(summary.positionCount).toBe(3);
  });

  test('the same validator on two chains counts twice', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, activeValidators: [VAL_A, VAL_B] }),
      makePosition({ chainId: KUSAMA, activeValidators: [VAL_A] }),
    ]);

    expect(summary.byChain[POLKADOT]?.activeValidatorCount).toBe(2);
    expect(summary.byChain[KUSAMA]?.activeValidatorCount).toBe(1);
    expect(summary.activeValidatorCount).toBe(3);
  });

  test('a validator shared by two positions of one chain counts once', () => {
    const summary = summarizePositions([
      makePosition({ chainId: POLKADOT, accountId: ALICE, activeValidators: [VAL_A] }),
      makePosition({ chainId: POLKADOT, accountId: BOB, activeValidators: [VAL_A] }),
    ]);

    expect(summary.activeValidatorCount).toBe(1);
  });

  test('only active positions count as earning', () => {
    const summary = summarizePositions([
      makePosition({ status: 'active' }),
      makePosition({ accountId: BOB, status: 'inactive' }),
    ]);

    expect(summary.positionCount).toBe(2);
    expect(summary.earningPositionCount).toBe(1);
  });

  test('an empty selection summarizes to zeroes, not to undefined', () => {
    const summary = summarizePositions([]);

    expect(summary).toEqual({
      chains: [],
      byChain: {},
      activeValidatorCount: 0,
      positionCount: 0,
      earningPositionCount: 0,
    });
  });
});
