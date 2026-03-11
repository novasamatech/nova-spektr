import { TransactionType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { multisigAccount, recipientAccount, senderAccount } from '../account';
import { assetHubChainId, polkadotChainId } from '../chain';

/**
 * Native DOT transfer transaction
 */
export const nativeTransferTx = {
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.TRANSFER,
  args: {
    dest: recipientAccount.accountId,
    value: '1000000000000', // 100 DOT
  },
};

/**
 * Asset transfer transaction (USDT)
 */
export const assetTransferTx = {
  chainId: assetHubChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.ASSET_TRANSFER,
  args: {
    asset: 1337,
    dest: recipientAccount.accountId,
    value: '100000000', // 100 USDT
  },
};

/**
 * XCM cross-chain transfer transaction
 */
export const xcmTransferTx = {
  chainId: polkadotChainId,
  accountId: senderAccount.accountId,
  type: TransactionType.XCM_LIMITED_TRANSFER,
  args: {
    dest: recipientAccount.accountId,
    destinationChain: assetHubChainId,
    asset: 0,
    value: '500000000000', // 50 DOT
    xcmFee: '5000000000', // 0.5 DOT
  },
};

/**
 * Multisig transaction
 */
export const multisigTransferTx = {
  chainId: polkadotChainId,
  accountId: multisigAccount.accountId,
  type: TransactionType.MULTISIG_AS_MULTI,
  args: {
    threshold: 2,
    otherSignatories: [createAccountId(12), createAccountId(13)],
    maybeTimepoint: null,
    callData: '0x0600...',
    callHash: '0x1234...',
  },
};

/**
 * Helper to create a transfer transaction
 */
export function createTransferTx(
  from: AnyAccount,
  to: AnyAccount,
  chainId: string,
  amount: string,
  type: TransactionType = TransactionType.TRANSFER,
) {
  return {
    chainId,
    accountId: from.accountId,
    type,
    args: {
      dest: to.accountId,
      value: amount,
    },
  };
}
