import { BN, BN_TEN } from '@polkadot/util';

import { type AssetBalance } from '@/shared/core';

import { balanceService } from './service';
import { type BalanceUpdateResult } from './types';

const TEST_ED = new BN(10);

describe('balanceService', () => {
  describe('update balance', () => {
    it('should withdraw without crossing ed', () => {
      const initial = createBalance({ free: 100, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, TEST_ED, 'keepAlive');

      expectBalanceToUpdated(actual, { free: 90, reserved: 0, frozen: 0 });
    });

    it('should withdraw crossing ed', () => {
      const initial = createBalance({ free: 11, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, TEST_ED, 'allowDeath');

      expectBalanceToUpdated(actual, { free: 0, reserved: 0, frozen: 0 });
    });

    it('should withdraw failing to cross ed', () => {
      const initial = createBalance({ free: 11, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, TEST_ED, 'keepAlive');

      expectToImbalanced(actual, 9);
    });

    it('should have correct imbalance after withdraw with allowDeath', () => {
      const initial = createBalance({ free: 20, reserved: 5, frozen: 10 });
      const actual = balanceService.tryWithdraw(initial, new BN(25), TEST_ED, 'allowDeath');

      expectToImbalanced(actual, 10);
    });

    it('should do simple reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const actual = balanceService.tryReserve(initial, new BN(5), TEST_ED);

      expectBalanceToUpdated(actual, { free: 15, reserved: 5, frozen: 0 });
    });

    it('should fail reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const actual = balanceService.tryReserve(initial, new BN(15), TEST_ED);

      expectToImbalanced(actual, 5);
    });

    it('should freeze', () => {
      const initial = createBalance({ free: 20, reserved: 10, frozen: 5 });
      const actual = balanceService.tryFreeze(initial, new BN(30));

      expectBalanceToUpdated(actual, { free: 20, reserved: 10, frozen: 30 });
    });

    it('should fail freeze', () => {
      const initial = createBalance({ free: 20, reserved: 10, frozen: 5 });
      const actual = balanceService.tryFreeze(initial, new BN(35));

      expectToImbalanced(actual, 5);
    });

    it('should combine multiple withdraws', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const fee = balanceService.tryWithdraw(initial, new BN(5), TEST_ED, 'keepAlive'); // New free is 15
      const transferAmount = balanceService.tryWithdraw(fee.balance, new BN(20), TEST_ED, 'keepAlive'); // We are 15 tokens short here. Fixed imbalance results in ed (10) in free
      const deliveryFee = balanceService.tryWithdraw(transferAmount.balance, new BN(15), TEST_ED, 'allowDeath');

      expectToImbalanced(deliveryFee, 20);
    });
  });
});

type BalanceBoilerplate = {
  free: number;
  reserved: number;
  frozen: number;
};

const createBalance = ({ free, reserved, frozen }: BalanceBoilerplate): AssetBalance => ({
  free: new BN(free),
  reserved: new BN(reserved),
  frozen: new BN(frozen),
});

const expectBalanceToUpdated = (actual: BalanceUpdateResult, expected: BalanceBoilerplate) => {
  expect(actual.success).toBeTruthy();
  if (actual.success) {
    expect(actual.balance.free?.toNumber()).toEqual(expected.free);
    expect(actual.balance.reserved?.toNumber()).toEqual(expected.reserved);
    expect(actual.balance.frozen?.toNumber()).toEqual(expected.frozen);
  }
};

const expectToImbalanced = (actual: BalanceUpdateResult, imbalance: number) => {
  expect(actual.success).toBeFalsy();
  if (actual.success === false) {
    expect(actual.imbalance.toNumber()).toBe(imbalance);
  }
};
