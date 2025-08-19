import { BN, BN_TEN } from '@polkadot/util';

import { type AssetId, type Balance, type BalanceId, type TransferableMode } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { balanceService } from './service';
import { type BalanceUpdateResult } from './types';

const TEST_ED = new BN(10);

describe('balanceService', () => {
  describe('update balance', () => {
    it('should withdraw without crossing ed (keepAlive)', () => {
      const initial = createBalance({ free: 100, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, 'keepAlive');

      expectBalanceToUpdated(actual, { free: 90, reserved: 0, frozen: 0 });
    });

    it('should withdraw crossing ed (allowDeath)', () => {
      const initial = createBalance({ free: 10, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, 'allowDeath');

      expectBalanceToUpdated(actual, { free: 0, reserved: 0, frozen: 0 });
    });

    it('should withdraw failing to cross ed', () => {
      const initial = createBalance({ free: 11, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, 'keepAlive');

      expectToImbalanced(actual, 9, { free: 0, reserved: 0, frozen: 0 });
    });

    it('should have correct imbalance after withdraw with allowDeath', () => {
      const initial = createBalance({ free: 20, reserved: 5, frozen: 10 });
      const actual = balanceService.tryWithdraw(initial, new BN(25), 'allowDeath');

      expectToImbalanced(actual, 10);
    });

    it('should correctly stack imbalances with keepAlive', () => {
      const initial = createBalance({ free: 2, reserved: 0, frozen: 0, ed: 1 });
      const first = balanceService.tryWithdraw(initial, new BN(3), 'keepAlive'); // imbalance = 2 DOT, balance = -1 DOT
      const second = balanceService.tryWithdraw(first.balance, new BN(3), 'keepAlive'); // imbalance = abs(-1 - (2+1)) = 4 DOT, balance = -3 DOT

      expectToImbalanced(first, 2);
      expectToImbalanced(second, 4);
    });

    it('should do simple reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const actual = balanceService.tryReserve(initial, new BN(5));

      expectBalanceToUpdated(actual, { free: 15, reserved: 5, frozen: 0 });
    });

    it('should fail reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const actual = balanceService.tryReserve(initial, new BN(15));

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

      const fee = balanceService.tryWithdraw(initial, new BN(5), 'keepAlive'); // New free is 15
      expectBalanceToUpdated(fee, { free: 15, reserved: 0, frozen: 0 });

      const transferAmount = balanceService.tryWithdraw(fee.balance, new BN(10), 'keepAlive'); // We are 5 tokens short here.
      expectToImbalanced(transferAmount, 5, { free: 0, reserved: 0, frozen: 0 });

      const deliveryFee = balanceService.tryWithdraw(transferAmount.balance, new BN(15), 'allowDeath');

      expectToImbalanced(deliveryFee, 15);
    });
  });
});

type BalanceBoilerplate = {
  free: number;
  reserved: number;
  frozen: number;
  ed?: number;
  transferableMode?: TransferableMode;
};

const createBalance = ({ free, reserved, frozen, ed, transferableMode }: BalanceBoilerplate): Balance => ({
  id: '0' as BalanceId,
  accountId: '0x00' as AccountId,
  chainId: '0x00',
  assetId: 0 as AssetId,
  ed: nonNullable(ed) ? new BN(ed) : TEST_ED,
  transferableMode: transferableMode ?? 'holdAndFreezes',
  free: new BN(free),
  reserved: new BN(reserved),
  frozen: new BN(frozen),
  locked: [],
});

const expectBalance = (actual: BalanceUpdateResult, expected: BalanceBoilerplate) => {
  expect(actual.balance.free?.toNumber()).toEqual(expected.free);
  expect(actual.balance.reserved?.toNumber()).toEqual(expected.reserved);
  expect(actual.balance.frozen?.toNumber()).toEqual(expected.frozen);
};

const expectBalanceToUpdated = (actual: BalanceUpdateResult, expected: BalanceBoilerplate) => {
  expect(actual.success).toBeTruthy();

  expectBalance(actual, expected);
};

const expectToImbalanced = (actual: BalanceUpdateResult, imbalance: number, expected?: BalanceBoilerplate) => {
  expect(actual.success).toBeFalsy();
  if (actual.success === false) {
    expect(actual.imbalance.toNumber()).toBe(imbalance);
  }

  if (expected) {
    expectBalance(actual, expected);
  }
};
