import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it } from 'vitest';

import { type MultisigAccount, type Transaction, TransactionType, WrapperKind } from '@/shared/core';
import { createAccountId, createProxiedAccount, createVaultBaseAccount, polkadotChainId } from '@/shared/mocks';
import { transactionService } from '../transactionService';

const api = {} as ApiPromise;

const transaction: Transaction = {
  type: TransactionType.TRANSFER,
  chainId: polkadotChainId,
  accountId: createAccountId('sender'),
  args: { dest: createAccountId('destination'), value: '1000' },
};

describe('transactionService.getWrappedTransaction', () => {
  it('wraps the transaction into a proxy call', () => {
    const proxiedAccount = createProxiedAccount('proxied');
    const proxyAccount = createVaultBaseAccount('proxy', {
      walletId: 1,
      accountId: proxiedAccount.connections[0]!.proxyAccountId,
    });

    const { wrappedTx, coreTx } = transactionService.getWrappedTransaction({
      api,
      transaction,
      txWrappers: [{ kind: WrapperKind.PROXY, proxyAccount, proxiedAccount }],
    });

    expect(coreTx).toBe(transaction);
    expect(wrappedTx).toEqual({
      chainId: polkadotChainId,
      accountId: proxyAccount.accountId,
      type: TransactionType.PROXY,
      args: { real: proxiedAccount.accountId, forceProxyType: 'Any', transaction },
    });
  });

  it('rejects multisig wrappers instead of building an incomplete asMulti call', () => {
    const signer = createVaultBaseAccount('signer', { walletId: 1 });
    const multisigAccount = { accountId: createAccountId('multisig'), threshold: 2 } as unknown as MultisigAccount;

    expect(() =>
      transactionService.getWrappedTransaction({
        api,
        transaction,
        txWrappers: [{ kind: WrapperKind.MULTISIG, multisigAccount, signatories: [signer], signer }],
      }),
    ).toThrow('Multisig wrapping is not supported by getWrappedTransaction');
  });
});
