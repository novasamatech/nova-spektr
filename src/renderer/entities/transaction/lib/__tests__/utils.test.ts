import { type AnyDecodedTransaction } from '@/domains/network';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isTransferTransaction,
} from '../common/utils';

describe('entities/transaction/lib/onChainUtils', () => {
  test('should return true for a transfer transactions', () => {
    const transferTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'transfer',
      section: 'balances',
      args: {},
    };
    const currenciesTransferTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'transfer',
      section: 'currencies',
      args: {},
    };
    const tokensTransferTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'transfer',
      section: 'tokens',
      args: {},
    };
    const assetTransferTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'transfer',
      section: 'assets',
      args: {},
    };

    expect(isTransferTransaction(transferTransaction)).toEqual(true);
    expect(isTransferTransaction(currenciesTransferTransaction)).toEqual(true);
    expect(isTransferTransaction(tokensTransferTransaction)).toEqual(true);
    expect(isTransferTransaction(assetTransferTransaction)).toEqual(true);
  });

  test('should return false for an other transaction', () => {
    const transaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'bond',
      section: 'staking',
      args: {},
    };

    expect(isTransferTransaction(transaction)).toEqual(false);
  });

  test('should return true for add proxy transaction', () => {
    const transaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'addProxy',
      section: 'proxy',
      args: {},
    };

    expect(isAddProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for remove proxy transaction', () => {
    const transaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'removeProxy',
      section: 'proxy',
      args: {},
    };

    expect(isRemoveProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for manage proxy transaction', () => {
    const addProxyTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'addProxy',
      section: 'proxy',
      args: {},
    };
    const removeProxyTransaction: AnyDecodedTransaction = {
      type: 'decoded',
      method: 'removeProxy',
      section: 'proxy',
      args: {},
    };

    expect(isManageProxyTransaction(addProxyTransaction)).toEqual(true);
    expect(isManageProxyTransaction(removeProxyTransaction)).toEqual(true);
  });
});
