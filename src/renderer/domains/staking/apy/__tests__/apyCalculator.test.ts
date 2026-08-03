import { BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { STAKED_PORTION_IDEAL } from '../../constants';
import {
  calculateAvgRewardPercent,
  calculateExpectedApy,
  calculateValidatorApy,
  calculateYearlyInflation,
  getMedianCommission,
  perbillToPercent,
} from '../calculator';

type Stake = { totalStake: string; commission: number };

/**
 * Reproduces the legacy curve-based flow: pool reward rate from the NPoS curve,
 * then a per-validator APY relative to the average validator stake.
 */
const calculateApys = (validators: Stake[], totalIssuance: string): number[] => {
  const totalStaked = validators.reduce((acc, { totalStake }) => acc.plus(totalStake), new BigNumber(0));
  const stakedPortion = totalStaked.div(totalIssuance).toNumber();
  const avgRewardPercent = calculateAvgRewardPercent({
    yearlyInflation: calculateYearlyInflation(stakedPortion),
    stakedPortion,
  });
  const avgStake = totalStaked.div(validators.length);

  return validators.map(({ totalStake, commission }) =>
    calculateValidatorApy({ totalStake, commission, avgStake, avgRewardPercent }),
  );
};

describe('apy calculator', () => {
  describe('calculateValidatorApy', () => {
    test('should calculate apy_1', () => {
      const validators: Stake[] = [
        { totalStake: '201518287642337753', commission: 0 },
        { totalStake: '17885248866374479', commission: 20 },
        { totalStake: '23222870418140403', commission: 1 },
        { totalStake: '36636488281071686', commission: 1 },
        { totalStake: '201546708191976560', commission: 22 },
        { totalStake: '19473381214045547', commission: 20 },
        { totalStake: '201521525575495849', commission: 0 },
      ];

      expect(calculateApys(validators, '1659849717702888583')).toEqual([7.92, 71.36, 68.01, 43.11, 6.17, 65.54, 7.92]);
    });

    test('should calculate apy_2', () => {
      const validators: Stake[] = [
        { totalStake: '25988353501946770', commission: 10 },
        { totalStake: '18515132296275736', commission: 8 },
        { totalStake: '19349393721433505', commission: 100 },
        { totalStake: '28107199630620499', commission: 0 },
        { totalStake: '21338216220340276', commission: 3 },
        { totalStake: '31594205163653010', commission: 40 },
        { totalStake: '18651950195834053', commission: 100 },
      ];

      expect(calculateApys(validators, '288491482448402308')).toEqual([11.66, 16.73, 0, 11.98, 15.3, 6.39, 0]);
    });

    test('should scale inversely with the validator stake', () => {
      const params = { commission: 0, avgStake: '1000', avgRewardPercent: 0.1 };

      expect(calculateValidatorApy({ ...params, totalStake: '1000' })).toEqual(10);
      expect(calculateValidatorApy({ ...params, totalStake: '2000' })).toEqual(5);
      expect(calculateValidatorApy({ ...params, totalStake: '500' })).toEqual(20);
    });

    test('should cut the commission off the nominator reward', () => {
      const params = { totalStake: '1000', avgStake: '1000', avgRewardPercent: 0.1 };

      expect(calculateValidatorApy({ ...params, commission: 50 })).toEqual(5);
      expect(calculateValidatorApy({ ...params, commission: 100 })).toEqual(0);
    });

    test('should return zero for a validator without stake', () => {
      expect(
        calculateValidatorApy({ totalStake: '0', commission: 0, avgStake: '1000', avgRewardPercent: 0.1 }),
      ).toEqual(0);
    });
  });

  describe('getMedianCommission', () => {
    test('should take the middle value of an odd list', () => {
      expect(getMedianCommission([10, 1, 5])).toEqual(5);
    });

    test('should average the two middle values of an even list', () => {
      expect(getMedianCommission([10, 1, 5, 3])).toEqual(4);
    });

    test('should ignore validators taking the whole reward', () => {
      expect(getMedianCommission([100, 100, 5, 100])).toEqual(5);
    });

    test('should ignore zero commission promotions', () => {
      expect(getMedianCommission([0, 0, 8])).toEqual(8);
    });

    test('should fall back to zero when nothing is profitable', () => {
      expect(getMedianCommission([0, 100])).toEqual(0);
      expect(getMedianCommission([])).toEqual(0);
    });
  });

  describe('calculateExpectedApy', () => {
    test('should express the pool reward rate as a percent', () => {
      expect(calculateExpectedApy(0.0544, 0)).toEqual(5.44);
    });

    test('should reduce the pool reward rate by the median commission', () => {
      expect(calculateExpectedApy(0.0544, 10)).toEqual(4.9);
    });
  });

  describe('calculateYearlyInflation', () => {
    test('should peak at the ideal staked portion', () => {
      expect(calculateYearlyInflation(STAKED_PORTION_IDEAL)).toBeCloseTo(0.1, 10);
    });

    test('should stay continuous across the ideal staked portion', () => {
      const below = calculateYearlyInflation(STAKED_PORTION_IDEAL - 1e-9);
      const above = calculateYearlyInflation(STAKED_PORTION_IDEAL + 1e-9);

      expect(below).toBeCloseTo(above, 8);
    });

    test('should decay above the ideal staked portion', () => {
      const atIdeal = calculateYearlyInflation(STAKED_PORTION_IDEAL);

      expect(calculateYearlyInflation(STAKED_PORTION_IDEAL + 0.05)).toBeLessThan(atIdeal);
      expect(calculateYearlyInflation(0.95)).toBeLessThan(calculateYearlyInflation(0.8));
    });

    test('should grow up to the ideal staked portion', () => {
      expect(calculateYearlyInflation(0.25)).toBeLessThan(calculateYearlyInflation(0.5));
      expect(calculateYearlyInflation(0.5)).toBeLessThan(calculateYearlyInflation(STAKED_PORTION_IDEAL));
    });
  });

  describe('calculateAvgRewardPercent', () => {
    test('should spread the inflation over the staked portion', () => {
      expect(calculateAvgRewardPercent({ yearlyInflation: 0.1, stakedPortion: 0.5 })).toEqual(0.2);
    });

    test('should return zero when nothing is staked', () => {
      expect(calculateAvgRewardPercent({ yearlyInflation: 0.1, stakedPortion: 0 })).toEqual(0);
    });
  });

  describe('perbillToPercent', () => {
    test('should convert perbill into percent', () => {
      expect(perbillToPercent(new BN(0))).toEqual(0);
      expect(perbillToPercent(new BN(100_000_000))).toEqual(10);
      expect(perbillToPercent(new BN(1_000_000_000))).toEqual(100);
      expect(perbillToPercent(new BN(25_000_000))).toEqual(2.5);
    });
  });
});
