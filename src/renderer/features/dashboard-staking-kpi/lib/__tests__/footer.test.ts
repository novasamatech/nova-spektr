import { getUnbondingFooter, getUnclaimedFooter } from '../footer';

const DOT = { symbol: 'DOT', precision: 10 };
const KSM = { symbol: 'KSM', precision: 12 };

describe('unbonding footer visibility', () => {
  test('drops entirely when nothing is unbonding or redeemable', () => {
    const footer = getUnbondingFooter({
      unbonding: [{ ...DOT, amount: '0' }],
      redeemable: [{ ...DOT, amount: '0' }],
      withdrawableCount: 0,
    });

    expect(footer).toBeNull();
  });

  test('drops when there are no assets at all', () => {
    expect(getUnbondingFooter({ unbonding: [], redeemable: [], withdrawableCount: 0 })).toBeNull();
  });

  test('appears for a position that only has matured chunks', () => {
    const footer = getUnbondingFooter({
      unbonding: [{ ...DOT, amount: '0' }],
      redeemable: [{ ...DOT, amount: '500' }],
      withdrawableCount: 1,
    });

    expect(footer).not.toBeNull();
    expect(footer?.amounts).toEqual([{ ...DOT, amount: '500' }]);
    expect(footer?.withdrawableCount).toBe(1);
  });

  test('merges unbonding and redeemable of the same asset', () => {
    const footer = getUnbondingFooter({
      unbonding: [
        { ...DOT, amount: '100' },
        { ...KSM, amount: '7' },
      ],
      redeemable: [
        { ...DOT, amount: '50' },
        { ...KSM, amount: '0' },
      ],
      withdrawableCount: 1,
    });

    expect(footer?.amounts).toEqual([
      { ...DOT, amount: '150' },
      { ...KSM, amount: '7' },
    ]);
  });
});

describe('unclaimed footer visibility', () => {
  test('drops when there is nothing unclaimed', () => {
    expect(getUnclaimedFooter({ totalFiat: '0', amounts: [{ ...DOT, amount: '0' }], daysUntilExpiry: 12 })).toBeNull();
  });

  test('appears with the expiry countdown when something is unclaimed', () => {
    const footer = getUnclaimedFooter({
      totalFiat: '128.4',
      amounts: [{ ...DOT, amount: '9000' }],
      daysUntilExpiry: 12,
    });

    expect(footer).toEqual({
      totalFiat: '128.4',
      amounts: [{ ...DOT, amount: '9000' }],
      daysUntilExpiry: 12,
      historyDepth: null,
    });
  });

  test('carries the history depth of the chain the countdown belongs to', () => {
    const footer = getUnclaimedFooter({
      totalFiat: '128.4',
      amounts: [{ ...DOT, amount: '9000' }],
      daysUntilExpiry: 12,
      historyDepth: 30,
    });

    expect(footer?.historyDepth).toBe(30);
  });

  test('survives an unpriced asset — the tokens are still claimable', () => {
    const footer = getUnclaimedFooter({
      totalFiat: '0',
      amounts: [{ ...KSM, amount: '9000' }],
      daysUntilExpiry: null,
    });

    expect(footer?.amounts).toHaveLength(1);
    expect(footer?.daysUntilExpiry).toBeNull();
  });
});
