import { BN } from '@polkadot/util';

import { PERBILL, calculateNominatorPayout, calculateValidatorPayout } from '../calculator';

const bn = (value: number | string) => new BN(value);

/**
 * Era payout of 1000 split between two validators with equal points, so the
 * validator earns 500 in every scenario below.
 */
const share = {
  eraReward: bn(1000),
  validatorPoints: bn(100),
  totalPoints: bn(200),
};

const percent = (value: number) => PERBILL.muln(value).divn(100);

describe('domains/staking/payouts/calculator', () => {
  describe('calculateNominatorPayout', () => {
    test('should split the era payout by points, commission and stake share', () => {
      const payout = calculateNominatorPayout({
        ...share,
        commission: percent(10),
        stake: bn(300),
        totalStake: bn(1000),
      });

      // 500 validator payout - 50 commission = 450 leftover; 450 * 300/1000
      expect(payout.toString()).toEqual('135');
    });

    test('should pay nothing when the validator takes 100% commission', () => {
      const payout = calculateNominatorPayout({
        ...share,
        commission: PERBILL,
        stake: bn(300),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('0');
    });

    test('should pay nothing when the era has no reward points', () => {
      const payout = calculateNominatorPayout({
        eraReward: bn(1000),
        validatorPoints: bn(0),
        totalPoints: bn(0),
        commission: bn(0),
        stake: bn(300),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('0');
    });

    test('should pay nothing when the validator earned no points', () => {
      const payout = calculateNominatorPayout({
        eraReward: bn(1000),
        validatorPoints: bn(0),
        totalPoints: bn(200),
        commission: bn(0),
        stake: bn(300),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('0');
    });

    test('should pay nothing without exposure', () => {
      const payout = calculateNominatorPayout({
        ...share,
        commission: bn(0),
        stake: bn(0),
        totalStake: bn(0),
      });

      expect(payout.toString()).toEqual('0');
    });
  });

  describe('calculateValidatorPayout', () => {
    test('should sum commission and own stake share', () => {
      const payout = calculateValidatorPayout({
        ...share,
        commission: percent(10),
        ownStake: bn(200),
        totalStake: bn(1000),
      });

      // 50 commission + 450 * 200/1000 own share
      expect(payout.toString()).toEqual('140');
    });

    test('should take the whole validator payout at 100% commission', () => {
      const payout = calculateValidatorPayout({
        ...share,
        commission: PERBILL,
        ownStake: bn(200),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('500');
    });

    test('should pay only the own share at zero commission', () => {
      const payout = calculateValidatorPayout({
        ...share,
        commission: bn(0),
        ownStake: bn(200),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('100');
    });

    test('should clamp commission above 100%', () => {
      const payout = calculateValidatorPayout({
        ...share,
        commission: PERBILL.muln(2),
        ownStake: bn(200),
        totalStake: bn(1000),
      });

      expect(payout.toString()).toEqual('500');
    });
  });
});
