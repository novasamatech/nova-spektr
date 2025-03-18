import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { isString } from 'lodash';

import {
  type Chain,
  type ChainId,
  type Contact,
  type Explorer,
  type HexString,
  type ProxyType,
  type Signatory,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { dictionary, isHex, toAccountId, toAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type AnyDecodedTransaction, type MultisigEvent, accountService } from '@/domains/network';
import { type TransactionVote, votingService } from '@/entities/governance';
import { getTransactionType } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

export const getMultisigExtrinsicLink = (
  callHash?: HexString,
  indexCreated?: number,
  blockCreated?: number,
  explorers?: Explorer[],
): string | undefined => {
  if (!callHash || !indexCreated || !blockCreated || !explorers) return;

  const multisigLink = explorers.find((e) => e.multisig)?.multisig;

  if (!multisigLink) return;

  return multisigLink.replace('{index}', `${blockCreated}-${indexCreated}`).replace('{callHash}', callHash);
};

export const getSignatoryName = (
  signatoryId: AccountId,
  txSignatories: Signatory[],
  contacts: Contact[],
  wallets: Wallet[],
  addressPrefix?: number,
): string => {
  const finderFn = <T extends { accountId: AccountId }>(collection: T[]): T | undefined => {
    return collection.find((c) => c.accountId === signatoryId);
  };

  // signatory data source priority: transaction -> contacts -> wallets -> address
  const fromTx = finderFn(txSignatories)?.name;
  if (fromTx) return fromTx;

  const fromContact = finderFn(contacts)?.name;
  if (fromContact) return fromContact;

  const accounts = wallets.map((wallet) => wallet.accounts).flat();
  const fromAccount = finderFn(accounts)?.name;
  if (fromAccount) return fromAccount;

  return toAddress(signatoryId, { chunk: 5, prefix: addressPrefix });
};

export const getSignatoryAccounts = (
  accounts: AnyAccount[],
  wallets: Wallet[],
  events: MultisigEvent[],
  signatories: Signatory[],
  chainId: ChainId,
): AnyAccount[] => {
  const walletsMap = dictionary(wallets, 'id');

  const result = [];

  for (const signatory of signatories) {
    const filteredAccounts = accounts.filter(
      (a) => a.accountId === signatory.accountId && !events.some((e) => e.accountId === a.accountId),
    );

    const signatoryAccount = filteredAccounts.find((a) => {
      const isChainMatch = accountUtils.isChainIdMatch(a, chainId);
      const wallet = walletsMap[a.walletId];

      return isChainMatch && walletUtils.isValidSignatory(wallet);
    });

    if (signatoryAccount) {
      result.push(signatoryAccount);
    } else {
      const legacySignatoryAccount = filteredAccounts.find(
        (a) => accountUtils.isChainDependant(a) && accountService.isChainAccount(a) && a.chainId === chainId,
      );
      if (legacySignatoryAccount) {
        result.push(legacySignatoryAccount);
      }
    }
  }

  return result;
};

export const getAssetId = (transaction: AnyDecodedTransaction) => {
  const asset = transaction.args.assetId;
  return isString(asset) ? asset : null;
};

export const getAsset = (transaction: AnyDecodedTransaction) => {
  const asset = transaction.args.asset;
  return isString(asset) ? asset : null;
};

export const getDestinationAddress = (transaction: AnyDecodedTransaction, chain: Chain) => {
  const accountId = getDestinationAccountId(transaction);
  return accountId ? toAddress(accountId, { prefix: chain.addressPrefix }) : null;
};

export const getDestinationAccountId = (transaction: AnyDecodedTransaction) => {
  const dest = transaction.args.dest;
  return isString(dest) ? toAccountId(dest) : null;
};

export const getPayee = (transaction: AnyDecodedTransaction) => {
  const payee = transaction.args.payee;
  return isString(payee) ? payee : null;
};

export const getDelegate = (transaction: AnyDecodedTransaction) => {
  const delegate = transaction.args.delegate;
  return isString(delegate) ? delegate : null;
};

export const getDestinationChain = (transaction: AnyDecodedTransaction) => {
  const destinationChain = transaction.args?.destinationChain;
  return isString(destinationChain) && isHex(destinationChain) ? destinationChain : null;
};

export const getSpawner = (tx: AnyDecodedTransaction): AccountId | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.spawner;
};

export const getProxyType = (tx: AnyDecodedTransaction): ProxyType | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.proxyType;
};

export const getDelegationVotes = (tx: AnyDecodedTransaction): string | undefined => {
  const txData = getOperationData(tx);
  if (!txData || !txData.method || !txData.section) return undefined;

  const transactionType = getTransactionType(txData.method, txData.section);
  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = txData.args?.calls?.find(
      (operationData: AnyDecodedTransactionData) =>
        operationData.method &&
        operationData.section &&
        getTransactionType(operationData.method, operationData.section) === TransactionType.DELEGATE,
    );
  } else if (transactionType === TransactionType.DELEGATE) {
    coreTx = txData;
  }

  if (!coreTx) return;

  const balance = new BN(coreTx.args.balance || 0);
  const conviction = new BN(votingService.getConvictionMultiplier(coreTx.args.conviction) || 0);

  return balance.mul(conviction).toString();
};

export const getDelegationTarget = (tx: AnyDecodedTransaction): string | undefined => {
  const txData = getOperationData(tx);
  if (!txData || !txData.method || !txData.section) return undefined;

  const transactionType = getTransactionType(txData.method, txData.section);

  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = txData.args?.calls?.find(
      (operationData: AnyDecodedTransactionData) =>
        getTransactionType(operationData.method, operationData.section) === TransactionType.DELEGATE,
    );
  } else if (transactionType === TransactionType.DELEGATE) {
    coreTx = txData;
  }

  return coreTx?.args.target;
};

export const getDelegationTracks = (tx: AnyDecodedTransaction): string[] | undefined => {
  const coreTxDelegate = getOperationData(tx);
  if (!coreTxDelegate) return undefined;

  let coreTxs;
  const transactionType = getTransactionType(coreTxDelegate.method, coreTxDelegate.section);

  if (transactionType === TransactionType.BATCH_ALL) {
    const delegateTxs = coreTxDelegate.args?.calls?.filter(
      (operationData: AnyDecodedTransactionData) =>
        TransactionType.DELEGATE === getTransactionType(operationData.method, operationData.section),
    );
    const undelegateTxs = coreTxDelegate.args?.calls?.filter(
      (operationData: AnyDecodedTransactionData) =>
        TransactionType.UNDELEGATE === getTransactionType(operationData.method, operationData.section),
    );

    coreTxs = delegateTxs?.length > 0 ? delegateTxs : undelegateTxs;
  } else if (transactionType && [TransactionType.DELEGATE, TransactionType.UNDELEGATE].includes(transactionType)) {
    coreTxs = [coreTxDelegate];
  }

  if (!coreTxs || coreTxs.length === 0) return;

  return coreTxs.map((tx: AnyDecodedTransactionData) => tx.args?.track?.toString());
};

export const getUndelegationData = async (
  api: ApiPromise,
  transaction: AnyDecodedTransaction,
): Promise<{ votes: string | undefined; target: string | undefined }> => {
  if (!transaction || !transaction.method || !transaction.section) return { votes: undefined, target: undefined };

  const transactionType = getTransactionType(transaction.method, transaction.section);

  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = transaction.args?.calls?.find(
      (operationData: AnyDecodedTransactionData) =>
        getTransactionType(operationData.method, operationData.section) === TransactionType.UNDELEGATE,
    );
  } else if (transactionType === TransactionType.UNDELEGATE) {
    coreTx = transaction;
  }

  if (!coreTx) return { votes: undefined, target: undefined };

  const votes = await convictionVotingPallet.storage.votingFor(api, [[coreTx.address, coreTx.args.track]]);

  const delegation = votes.find((vote) => vote.type === 'Delegating');

  return {
    votes:
      delegation && votingService.calculateVotingPower(delegation.data.balance, delegation.data.conviction).toString(),
    target: delegation && toAddress(delegation.data.target),
  };
};

export const getReferendumId = (tx: AnyDecodedTransaction): string | undefined => {
  const coreTx = getOperationData(tx);

  return coreTx?.args?.referendum;
};

export const getVote = (tx: AnyDecodedTransaction): TransactionVote | undefined => {
  const coreTx = getOperationData(tx);

  return coreTx?.args?.vote;
};

export const getSignatoryStatus = (events: MultisigEvent[], signatory: AccountId) => {
  const cancelEvent = events.find((e) => e.status === 'reject' && e.accountId === signatory);
  if (cancelEvent) {
    return cancelEvent.status;
  }

  const signedEvent = events.find((e) => e.status === 'approve' && e.accountId === signatory);
  if (signedEvent) {
    return signedEvent.status;
  }

  return null;
};
