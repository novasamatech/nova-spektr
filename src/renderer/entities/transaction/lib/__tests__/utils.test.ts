import { type MultisigOperationData } from '@/domains/network';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isTransferTransaction,
} from '../common/utils';

describe('entities/transaction/lib/onChainUtils', () => {
  test('should return true for a transfer transactions', () => {
    const transferTransaction: MultisigOperationData = {
      method: 'transfer',
      section: 'balances',
    };
    const currenciesTransferTransaction: MultisigOperationData = {
      method: 'transfer',
      section: 'currencies',
    };
    const tokensTransferTransaction: MultisigOperationData = {
      method: 'transfer',
      section: 'tokens',
    };
    const assetTransferTransaction: MultisigOperationData = {
      method: 'transfer',
      section: 'assets',
    };

    expect(isTransferTransaction(transferTransaction)).toEqual(true);
    expect(isTransferTransaction(currenciesTransferTransaction)).toEqual(true);
    expect(isTransferTransaction(tokensTransferTransaction)).toEqual(true);
    expect(isTransferTransaction(assetTransferTransaction)).toEqual(true);
  });

  test('should return false for an other transaction', () => {
    const transaction: MultisigOperationData = {
      method: 'bond',
      section: 'staking',
    };

    expect(isTransferTransaction(transaction)).toEqual(false);
  });

  test('should return true for add proxy transaction', () => {
    const transaction: MultisigOperationData = {
      method: 'addProxy',
      section: 'proxy',
    };

    expect(isAddProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for remove proxy transaction', () => {
    const transaction: MultisigOperationData = {
      method: 'removeProxy',
      section: 'proxy',
    };

    expect(isRemoveProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for manage proxy transaction', () => {
    const addProxyTransaction: MultisigOperationData = {
      method: 'addProxy',
      section: 'proxy',
    };
    const removeProxyTransaction: MultisigOperationData = {
      method: 'removeProxy',
      section: 'proxy',
    };

    expect(isManageProxyTransaction(addProxyTransaction)).toEqual(true);
    expect(isManageProxyTransaction(removeProxyTransaction)).toEqual(true);
  });
});
