import { BN, BN_TEN } from '@polkadot/util';

import { type AssetId, type Balance, type BalanceId, type TransferableMode, AssetType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { balanceService } from './service';
import { type BalanceUpdateResult } from './types';

const TEST_ED = new BN(1);

describe('balanceService', () => {
  describe('withdraw', () => {
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

    it('should force keepAlive strategy if there are some consumers of the balance', () => {
      const initial = createBalance({ free: 10, reserved: 0, frozen: 0, consumers: 1 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, 'allowDeath');

      expectToImbalanced(actual, 1, { free: 1, reserved: 0, frozen: 0 });
    });

    it('should withdraw failing to cross ed', () => {
      const initial = createBalance({ free: 10, reserved: 0, frozen: 0 });
      const actual = balanceService.tryWithdraw(initial, BN_TEN, 'keepAlive');

      expectToImbalanced(actual, 1, { free: 1, reserved: 0, frozen: 0 });
    });

    it('should have correct imbalance after withdraw with allowDeath', () => {
      const initial = createBalance({ free: 20, reserved: 5, frozen: 10 });
      const actual = balanceService.tryWithdraw(initial, new BN(25), 'allowDeath');

      expectToImbalanced(actual, 10);
    });

    it('should correctly stack imbalances with keepAlive', () => {
      const initial = createBalance({ free: 2, reserved: 0, frozen: 0 });

      const first = balanceService.tryWithdraw(initial, new BN(3), 'keepAlive');
      expectToImbalanced(first, 2, { free: 1, reserved: 0, frozen: 0 });

      const second = balanceService.tryWithdraw(first.balance, new BN(2), 'keepAlive');
      expectToImbalanced(second, 2, { free: 1, reserved: 0, frozen: 0 });
    });

    it('should correctly stack imbalances with keepAlive and zero balance', () => {
      const initial = createBalance({ free: 0, reserved: 0, frozen: 0 });

      const first = balanceService.tryWithdraw(initial, new BN(3), 'keepAlive');
      expectToImbalanced(first, 4, { free: 1, reserved: 0, frozen: 0 });

      const second = balanceService.tryWithdraw(first.balance, new BN(2), 'keepAlive');
      expectToImbalanced(second, 2, { free: 1, reserved: 0, frozen: 0 });
    });

    it('should correctly stack imbalances with keepAlive and allowDeath', () => {
      const initial = createBalance({ free: 15, reserved: 0, frozen: 0, ed: 10 });

      const first = balanceService.tryWithdraw(initial, new BN(15), 'keepAlive');
      expectToImbalanced(first, 10, { free: 10, reserved: 0, frozen: 0 });

      const second = balanceService.tryWithdraw(first.balance, new BN(15), 'allowDeath');
      expectToImbalanced(second, 5, { free: 0, reserved: 0, frozen: 0 });

      const third = balanceService.tryWithdraw(second.balance, new BN(10), 'keepAlive');
      expectToImbalanced(third, 20, { free: 10, reserved: 0, frozen: 0 });
    });

    it('should combine multiple withdraws', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0, ed: 10 });

      const fee = balanceService.tryWithdraw(initial, new BN(5), 'keepAlive');
      expectBalanceToUpdated(fee, { free: 15, reserved: 0, frozen: 0 });

      const transferAmount = balanceService.tryWithdraw(fee.balance, new BN(10), 'keepAlive');
      expectToImbalanced(transferAmount, 5, { free: 10, reserved: 0, frozen: 0 });

      const deliveryFee = balanceService.tryWithdraw(transferAmount.balance, new BN(15), 'allowDeath');

      expectToImbalanced(deliveryFee, 5, { free: 0, reserved: 0, frozen: 0 });
    });
  });

  describe('reserve', () => {
    it('should do simple reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const actual = balanceService.tryReserve(initial, new BN(5));

      expectBalanceToUpdated(actual, { free: 15, reserved: 5, frozen: 0 });
    });

    it('should fail reserve', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0, ed: 10 });
      const actual = balanceService.tryReserve(initial, new BN(15));

      expectToImbalanced(actual, 5);
    });
  });

  describe('freeze', () => {
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
  });

  describe('withdrawable amount', () => {
    it('should calculate withdrawable for keepAlive', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const withdrawable = balanceService.withdrawableAmount(initial, 'keepAlive');

      expect(withdrawable.toNumber()).toEqual(19);
    });

    it('should calculate withdrawable for allowDeath', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0 });
      const withdrawable = balanceService.withdrawableAmount(initial, 'allowDeath');

      expect(withdrawable.toNumber()).toEqual(20);
    });

    it('should calculate withdrawable for allowDeath when there are still some consumers', () => {
      const initial = createBalance({ free: 20, reserved: 0, frozen: 0, consumers: 1 });
      const withdrawable = balanceService.withdrawableAmount(initial, 'allowDeath');

      expect(withdrawable.toNumber()).toEqual(19);
    });
  });
});

type BalanceBoilerplate = {
  free: number;
  reserved: number;
  frozen: number;
  ed?: number;
  transferableMode?: TransferableMode;
  providers?: number;
  consumers?: number;
};

const createBalance = ({
  free,
  reserved,
  frozen,
  ed,
  transferableMode,
  providers,
  consumers,
}: BalanceBoilerplate): Balance => ({
  id: '0' as BalanceId,
  accountId: '0x00' as AccountId,
  chainId: '0x00',
  assetId: 0 as AssetId,
  assetType: AssetType.NATIVE,
  ed: nonNullable(ed) ? new BN(ed) : TEST_ED,
  transferableMode: transferableMode ?? 'holdAndFreezes',
  free: new BN(free),
  reserved: new BN(reserved),
  frozen: new BN(frozen),
  locked: [],
  providers: providers ?? 1,
  consumers: consumers ?? 0,
  sufficients: 0,
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
