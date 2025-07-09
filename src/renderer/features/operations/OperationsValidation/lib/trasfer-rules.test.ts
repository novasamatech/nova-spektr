import { createStore } from 'effector';
import { describe, expect, it } from 'vitest';

import { type Asset, AssetType, type Chain, ChainOptions } from '@/shared/core';
import { ZERO_BALANCE } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { type TransferAccountStore, type TransferSignatoryFeeStore } from '../types/types';

import { TransferRules } from './transfer-rules';

const createTestAsset = (): Asset => ({
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  name: 'Polkadot',
  icon: { monochrome: '', colored: '' },
  type: AssetType.NATIVE,
});

const createTestChain = (ethChain: boolean = false): Chain => ({
  chainId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  specName: 'polkadot',
  name: 'Polkadot',
  assets: [createTestAsset()],
  nodes: [],
  icon: '',
  addressPrefix: 0,
  options: ethChain ? [ChainOptions.ETHEREUM_BASED] : [],
});

describe('Transfer Validation Rules', () => {
  const defaultConfig = { withFormatAmount: false };

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
      expect(rule.validator({ address: 'some-address' } as unknown as AnyAccount, {}, true)).toBe(true);
    });

    it('should fail when no signatory is selected for multisig', () => {
      const store = createStore(true);
      const rule = TransferRules.signatory.noSignatorySelected(store);
      expect(rule.validator(null, {}, true)).toBe(false);
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

    it('should fail when signatory has insufficient balance for deposit', () => {
      const transferSignatoryFeeStore: TransferSignatoryFeeStore = {
        fee: '0',
        isMultisig: true,
        multisigDeposit: '2000000000',
        balance: '1000000000',
      };
      const store = createStore<TransferSignatoryFeeStore>(transferSignatoryFeeStore);

      const rule = TransferRules.signatory.notEnoughTokens(store);
      expect(rule.validator(null, {}, transferSignatoryFeeStore)).toBe(false);
    });

    it('should fail when signatory has insufficient balance for fee', () => {
      const transferSignatoryFeeStore: TransferSignatoryFeeStore = {
        fee: '2000000000',
        isMultisig: true,
        multisigDeposit: '0',
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
      expect(rule.validator('13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq')).toBe(true);
    });

    it('should fail when destination is empty', () => {
      const rule = TransferRules.destination.required;
      expect(rule.validator(undefined)).toBe(false);
    });

    it('should pass when destination address is valid for Substrate chain', () => {
      const chain = createTestChain();
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq', {}, chain)).toBe(true);
    });

    it('should fail when destination address is invalid for Substrate chain', () => {
      const chain = createTestChain();
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('invalid-address', {}, chain)).toBe(false);
    });
    it('should pass when destination address is valid for ETH chain - no checksum', () => {
      const chain = createTestChain(true);
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('0xc4d9aa77d94c36d737c5a25f5cdd0fcc7baef963', {}, chain)).toBe(true);
    });

    it('should pass when destination address is valid for ETH chain - checksum', () => {
      const chain = createTestChain(true);
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('0xC4d9Aa77d94c36D737c5A25F5CdD0FCC7BAEf963', {}, chain)).toBe(true);
    });

    it('should fail when destination address is eth for substrate', () => {
      const chain = createTestChain();
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('0xC4d9Aa77d94c36D737c5A25F5CdD0FCC7BAEf963', {}, chain)).toBe(false);
    });

    it('should fail when destination address is substrate for eth', () => {
      const chain = createTestChain(true);
      const store = createStore(chain);
      const rule = TransferRules.destination.incorrectRecipient(store);

      expect(rule.validator('13mAjFVjFDpfa42k2dLdSnUyrSzK8vAySsoudnxX2EKVtfaq', {}, chain)).toBe(false);
    });

    it('should fail when destination address is invalid', () => {
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

      const rule = TransferRules.amount.notEnoughBalance(store, defaultConfig);
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

      const rule = TransferRules.amount.notEnoughBalance(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForFee(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForFee(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForXcmFee(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForXcmFee(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForDeliveryFee(store, defaultConfig);
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

      const rule = TransferRules.amount.insufficientBalanceForDeliveryFee(store, defaultConfig);
      expect(rule.validator('1000000000', {}, storeState)).toBe(false);
    });

    it('should pass when amount is valid with format amount and asset precision', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: { ...createTestAsset(), precision: 10 },
        },
        balance: { balance: '15000000000', native: '15000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.notEnoughBalance(store, { withFormatAmount: true });
      expect(rule.validator('1.5', {}, storeState)).toBe(true);
    });

    it('should fail when amount exceeds balance with format amount and asset precision', () => {
      const storeState = {
        network: {
          chain: createTestChain(),
          asset: { ...createTestAsset(), precision: 10 },
        },
        balance: { balance: '1000000000', native: '1000000000' },
      };
      const store = createStore(storeState);

      const rule = TransferRules.amount.notEnoughBalance(store, { withFormatAmount: true });
      expect(rule.validator('2.5', {}, storeState)).toBe(false);
    });
  });
});
