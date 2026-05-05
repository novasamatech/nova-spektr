import { BN, BN_ZERO } from '@polkadot/util';
import { type Store } from 'effector';
import { describe, expect, test } from 'vitest';

import {
  type Asset,
  type AssetId,
  type Balance,
  type BalanceMap,
  type Chain,
  type ChainId,
  AssetType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '@/entities/balance';
import { type AccountStore, type SignatoryStore } from '../../types/types';
import { AddProxyRules } from '../add-proxy-rules';
import { ChangeSignatoriesRules, changeSignatoriesValidator } from '../change-signatories-rules';
import { validationUtils } from '../validation-utils';

const ACCOUNT_ID = '0x01' as AccountId;
const CHAIN_ID = '0x00' as ChainId;
const ASSET_ID = 0 as AssetId;

const nativeAsset: Asset = {
  assetId: ASSET_ID,
  name: 'Test Token',
  symbol: 'TST',
  precision: 10,
  icon: { monochrome: '', colored: '' },
  type: AssetType.NATIVE,
};

const chain: Chain = {
  chainId: CHAIN_ID,
  name: 'Test Chain',
  assets: [nativeAsset],
  nodes: [],
  addressPrefix: 0,
  specName: 'test',
  icon: '',
} as unknown as Chain;

const buildBalance = (overrides: Partial<Balance> = {}): Balance => ({
  id: balanceUtils.constructBalanceId(ACCOUNT_ID, CHAIN_ID, ASSET_ID),
  accountId: ACCOUNT_ID,
  chainId: CHAIN_ID,
  assetId: ASSET_ID,
  assetType: AssetType.NATIVE,
  free: new BN(1_000),
  frozen: BN_ZERO,
  reserved: BN_ZERO,
  locked: [],
  providers: 1,
  consumers: 0,
  sufficients: 0,
  ed: new BN(1),
  transferableMode: 'legacy',
  ...overrides,
});

const buildBalanceMap = (balance: Balance): BalanceMap => ({ [balance.id]: balance });

describe('ChangeSignatoriesRules', () => {
  test('aliases AddProxyRules so no validator logic is duplicated', () => {
    expect(ChangeSignatoriesRules.account).toBe(AddProxyRules.account);
    expect(ChangeSignatoriesRules.signatory).toBe(AddProxyRules.signatory);
    expect(ChangeSignatoriesRules.description).toBe(AddProxyRules.description);
  });

  describe('account.notEnoughTokens via applyValidationRules', () => {
    const buildRule = (source: AccountStore) => ({
      value: { accountId: ACCOUNT_ID },
      form: { chain },
      ...ChangeSignatoriesRules.account.notEnoughTokens({} as Store<AccountStore>),
      source,
    });

    test('passes when transferable balance covers fee + proxy deposit', () => {
      const balances = buildBalanceMap(buildBalance({ free: new BN(1_000) }));

      const result = validationUtils.applyValidationRules([
        buildRule({ fee: '100', proxyDeposit: '500', isMultisig: false, balances }),
      ]);

      expect(result).toBeUndefined();
    });

    test('fails when transferable balance is below fee + proxy deposit', () => {
      const balances = buildBalanceMap(buildBalance({ free: new BN(50) }));

      const result = validationUtils.applyValidationRules([
        buildRule({ fee: '100', proxyDeposit: '500', isMultisig: false, balances }),
      ]);

      expect(result?.name).toBe('notEnoughTokens');
    });

    test('multisig path checks withdrawable balance against proxy deposit only', () => {
      const balances = buildBalanceMap(buildBalance({ free: new BN(500), frozen: BN_ZERO }));

      const result = validationUtils.applyValidationRules([
        buildRule({ fee: '999', proxyDeposit: '500', isMultisig: true, balances }),
      ]);

      expect(result).toBeUndefined();
    });
  });

  describe('signatory.notEnoughTokens via applyValidationRules', () => {
    const buildRule = (source: SignatoryStore) => ({
      value: { accountId: ACCOUNT_ID },
      form: { chain },
      ...ChangeSignatoriesRules.signatory.notEnoughTokens({} as Store<SignatoryStore>),
      source,
    });

    test('skipped (passes) when not multisig', () => {
      const result = validationUtils.applyValidationRules([
        buildRule({
          fee: '999',
          multisigDeposit: '999',
          proxyDeposit: '0',
          isMultisig: false,
          balances: {},
        }),
      ]);

      expect(result).toBeUndefined();
    });

    test('passes when signatory has fee + multisig deposit', () => {
      const balances = buildBalanceMap(buildBalance({ free: new BN(1_000) }));

      const result = validationUtils.applyValidationRules([
        buildRule({
          fee: '100',
          multisigDeposit: '200',
          proxyDeposit: '0',
          isMultisig: true,
          balances,
        }),
      ]);

      expect(result).toBeUndefined();
    });

    test('fails when signatory cannot cover fee + multisig deposit', () => {
      const balances = buildBalanceMap(buildBalance({ free: new BN(50) }));

      const result = validationUtils.applyValidationRules([
        buildRule({
          fee: '100',
          multisigDeposit: '200',
          proxyDeposit: '0',
          isMultisig: true,
          balances,
        }),
      ]);

      expect(result?.name).toBe('notEnoughTokens');
    });
  });

  describe('description.maxLength', () => {
    const rule = {
      value: '',
      form: {},
      source: {},
      ...ChangeSignatoriesRules.description.maxLength,
    };

    test('passes for empty string', () => {
      expect(validationUtils.applyValidationRules([{ ...rule, value: '' }])).toBeUndefined();
    });

    test('passes at boundary (120 chars)', () => {
      expect(validationUtils.applyValidationRules([{ ...rule, value: 'x'.repeat(120) }])).toBeUndefined();
    });

    test('fails above 120 chars', () => {
      const result = validationUtils.applyValidationRules([{ ...rule, value: 'x'.repeat(121) }]);
      expect(result?.name).toBe('maxLength');
    });
  });
});

describe('changeSignatoriesValidator', () => {
  test('is a callable Validator function', () => {
    expect(typeof changeSignatoriesValidator).toBe('function');
  });
});
