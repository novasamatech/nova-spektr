import { createStore } from 'effector';
import { describe, expect, it } from 'vitest';

import { type Asset, AssetType, type Chain } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { TransferRules } from '@/features/operations/OperationsValidation';
import {
  type TransferAccountStore,
  type TransferSignatoryFeeStore,
} from '@/features/operations/OperationsValidation/types/types';

const createTestAsset = (): Asset => ({
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  name: 'Polkadot',
  icon: { monochrome: '', colored: '' },
  type: AssetType.NATIVE,
});

const createTestChain = (): Chain => ({
  chainId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  specName: 'polkadot',
  name: 'Polkadot',
  assets: [createTestAsset()],
  nodes: [],
  icon: '',
  addressPrefix: 0,
});

describe('Transfer Validation Rules', () => {
  describe('Account Validation', () => {
    it('should pass when proxy has enough native balance for fee', () => {
      const transferAccountStore: TransferAccountStore = {
        fee: '1000000000',
        isProxy: true,
        proxyBalance: { balance: '0', native: '2000000000' },
      };
      const store = createStore<TransferAccountStore>(transferAccountStore);

      const rule = TransferRules.account.noProxyFee(store);
      expect(rule.validator(null, {}, transferAccountStore)).toBe(true);
    });

    it('should fail when proxy has insufficient native balance for fee', () => {
      const transferAccountStore: TransferAccountStore = {
        fee: '2000000000',
        isProxy: true,
        proxyBalance: { balance: '0', native: '1000000000' },
      };
      const store = createStore<TransferAccountStore>(transferAccountStore);

      const rule = TransferRules.account.noProxyFee(store);
      expect(rule.validator(null, {}, transferAccountStore)).toBe(false);
    });

    it('should pass when not using proxy', () => {
      const transferAccountStore: TransferAccountStore = {
        fee: '1000000000',
        isProxy: false,
        proxyBalance: { balance: '0', native: '0' },
      };
      const store = createStore<TransferAccountStore>(transferAccountStore);

      const rule = TransferRules.account.noProxyFee(store);
      expect(rule.validator(null, {}, transferAccountStore)).toBe(true);
    });
  });

  describe('Signatory Validation', () => {
    it('should pass when no signatory is required', () => {
      const store = createStore(false);
      const rule = TransferRules.signatory.noSignatorySelected(store);
      expect(rule.validator(null, {}, false)).toBe(true);
    });

    it('should pass when signatory is selected for multisig', () => {
      const store = createStore(true);
      const rule = TransferRules.signatory.noSignatorySelected(store);
      expect(rule.validator(null, {}, true)).toBe(true);
    });

    it('should fail when no signatory is selected for multisig', () => {
      const store = createStore(true);
      const rule = TransferRules.signatory.noSignatorySelected(store);
      expect(rule.validator(null, {}, false)).toBe(false);
    });

    it('should pass when signatory has enough balance for fee and deposit', () => {
      const transferSignatoryFeeStore: TransferSignatoryFeeStore = {
        fee: '1000000000',
        isMultisig: true,
        multisigDeposit: '1000000000',
        balance: '3000000000',
      };
      const store = createStore<TransferSignatoryFeeStore>(transferSignatoryFeeStore);

      const rule = TransferRules.signatory.notEnoughTokens(store);
      expect(rule.validator(null, {}, transferSignatoryFeeStore)).toBe(true);
    });

    it('should fail when signatory has insufficient balance for fee and deposit', () => {
      const transferSignatoryFeeStore: TransferSignatoryFeeStore = {
        fee: '1000000000',
        isMultisig: true,
        multisigDeposit: '1000000000',
        balance: '1000000000',
      };
      const store = createStore<TransferSignatoryFeeStore>(transferSignatoryFeeStore);

      const rule = TransferRules.signatory.notEnoughTokens(store);
      expect(rule.validator(null, {}, transferSignatoryFeeStore)).toBe(false);
    });
  });

  describe('Destination Validation', () => {
    it('should pass when destination is provided', () => {
      const rule = TransferRules.destination.required;
      expect(rule.validator('5Hjdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjh')).toBe(true);
    });

    it('should fail when destination is empty', () => {
      const rule = TransferRules.destination.required;
      expect(rule.validator('')).toBe(false);
    });

    it('should pass when destination address is valid for chain', () => {
      const chain = createTestChain();
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('5Hjdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjhdsfkjh', {}, chain)).toBe(true);
    });

    it('should fail when destination address is invalid for chain', () => {
      const chain = createTestChain();
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('invalid-address', {}, chain)).toBe(false);
    });
  });

  describe('Amount Validation', () => {
    it('should pass when amount is provided', () => {
      const rule = TransferRules.amount.required;
      expect(rule.validator('1000000000')).toBe(true);
    });

    it('should fail when amount is empty', () => {
      const rule = TransferRules.amount.required;
      expect(rule.validator('')).toBe(false);
    });

    it('should pass when amount is non-zero', () => {
      const rule = TransferRules.amount.notZero;
      expect(rule.validator('1000000000')).toBe(true);
    });

    it('should fail when amount is zero', () => {
      const rule = TransferRules.amount.notZero;
      expect(rule.validator(ZERO_BALANCE)).toBe(false);
    });

    it('should pass when account has sufficient balance', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        balance: { balance: '2000000000', native: '2000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.notEnoughBalance(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(true);
    });

    it('should fail when account has insufficient balance', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        balance: { balance: '1000000000', native: '1000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.notEnoughBalance(store);
      expect(rule.validator('2000000000', {}, storeState)).toBe(false);
    });

    it('should pass when account has sufficient balance for fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '0',
        deliveryFee: '0',
        isNative: true,
        isProxy: false,
        isMultisig: false,
        isXcm: false,
        balance: { balance: '3000000000', native: '3000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(true);
    });

    it('should fail when account has insufficient balance for fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '0',
        deliveryFee: '0',
        isNative: true,
        isProxy: false,
        isMultisig: false,
        isXcm: false,
        balance: { balance: '1000000000', native: '1000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(false);
    });

    it('should pass when account has sufficient balance for XCM fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '1000000000',
        deliveryFee: '0',
        isNative: true,
        isProxy: false,
        isMultisig: false,
        isXcm: true,
        balance: { balance: '4000000000', native: '4000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForXcmFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(true);
    });

    it('should fail when account has insufficient balance for XCM fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '1000000000',
        deliveryFee: '0',
        isNative: true,
        isProxy: false,
        isMultisig: false,
        isXcm: true,
        balance: { balance: '1000000000', native: '1000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForXcmFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(false);
    });

    it('should pass when account has sufficient balance for delivery fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '0',
        deliveryFee: '1000000000',
        isNative: true,
        isProxy: true,
        isMultisig: true,
        isXcm: true,
        balance: { balance: '4000000000', native: '4000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForDeliveryFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(true);
    });

    it('should fail when account has insufficient balance for delivery fee', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: createTestAsset(),
        },
        fee: '1000000000',
        xcmFee: '0',
        deliveryFee: '1000000000',
        isNative: true,
        isProxy: true,
        isMultisig: true,
        isXcm: true,
        balance: { balance: '1000000000', native: '1000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.insufficientBalanceForDeliveryFee(store);
      expect(rule.validator('1000000000', {}, storeState)).toBe(false);
    });
  });
});
