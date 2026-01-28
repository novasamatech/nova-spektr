import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { isString } from 'lodash';

import {
  type Address,
  type Chain,
  type ChainId,
  type Contact,
  type DecodedTransaction,
  type Explorer,
  type HexString,
  type ProxyType,
  type Signatory,
  type Transaction,
  type Wallet,
  TransactionType,
} from '@/shared/core';
import { toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigEvent, type MultisigOperation } from '@/domains/network';
import { type TransactionVote, votingService } from '@/entities/governance';
import {
  getXcmTransactionBeneficiary,
  isDelegateTransaction,
  isProxyTransaction,
  isUndelegateTransaction,
  isXcmTransaction,
} from '@/entities/transaction';

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

export const getMultisigEventLink = (
  indexCreated: number,
  blockCreated: number,
  explorers: Explorer,
): string | undefined => {
  if (!indexCreated || !blockCreated || !explorers) return;

  const multisigLink = explorers.extrinsic;

  if (!multisigLink) return;

  return multisigLink.replace('{hash}', `${blockCreated}-${indexCreated}`);
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

  return toShortAddress(toAddress(signatoryId, { prefix: addressPrefix }), 5);
};

export const getAssetId = (operation: MultisigOperation) => {
  const asset = operation.transaction?.args.assetId;
  return isString(asset) ? asset : null;
};

export const getDestination = (
  tx: MultisigOperation,
  chains: Record<ChainId, Chain>,
  destinationChain?: ChainId,
): Address | undefined => {
  if (!tx.transaction) return undefined;

  const chain = destinationChain ? chains[destinationChain] : chains[tx.transaction.chainId];

  if (isProxyTransaction(tx.transaction)) {
    return toAddress(tx.transaction.args.transaction.args.dest, { prefix: chain.addressPrefix });
  }

  return toAddress(tx.transaction.args.dest, { prefix: chain.addressPrefix });
};

export const getDestinationAccountId = (tx: MultisigOperation): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  // For XCM transactions, use beneficiary extraction from XCM instructions
  if (isXcmTransaction(coreTx)) {
    return getXcmTransactionBeneficiary(coreTx);
  }

  return coreTx.args.dest;
};

export const getPayee = (tx: MultisigOperation): { Account: Address } | string | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  if (coreTx.type === TransactionType.BATCH_ALL) {
    return coreTx.args.transactions.at(0).args.payee;
  }

  return coreTx.args.payee;
};

export const getDelegate = (tx: MultisigOperation): Address | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.delegate;
};

export const getDestinationChain = (tx: MultisigOperation): ChainId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.destinationChain;
};

export const getSender = (tx: MultisigOperation): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.accountId;
};

export const getSpawner = (tx: MultisigOperation): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.spawner;
};

export const getProxyType = (tx: MultisigOperation): ProxyType | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.proxyType;
};

export const getDelegationVotes = (tx: MultisigOperation): string | undefined => {
  const coreTxDelegate = getCoreTx(tx);
  if (!coreTxDelegate) return undefined;

  let coreTx;

  if (coreTxDelegate.type === TransactionType.BATCH_ALL) {
    coreTx = coreTxDelegate.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
  } else if (isDelegateTransaction(coreTxDelegate)) {
    coreTx = coreTxDelegate;
  }

  if (!coreTx) return;

  const balance = new BN(coreTx.args.balance || 0);
  const conviction = new BN(votingService.getConvictionMultiplier(coreTx.args.conviction) || 0);

  return balance.mul(conviction).toString();
};

export const getDelegationTarget = (tx: MultisigOperation): AccountId | undefined => {
  const coreTxDelegate = getCoreTx(tx);
  if (!coreTxDelegate) return undefined;

  let coreTx;

  if (coreTxDelegate.type === TransactionType.BATCH_ALL) {
    coreTx = coreTxDelegate.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
  } else if (isDelegateTransaction(coreTxDelegate)) {
    coreTx = coreTxDelegate;
  }

  if (!coreTx) return;

  return toAccountId(coreTx?.args.target);
};

export const getDelegationTracks = (tx: MultisigOperation): string[] | undefined => {
  const coreTxDelegate = getCoreTx(tx);
  if (!coreTxDelegate) return undefined;

  let coreTxs;

  if (coreTxDelegate.type === TransactionType.BATCH_ALL) {
    const delegateTxs = coreTxDelegate.args.transactions?.filter(
      (tx: Transaction) => TransactionType.DELEGATE === tx.type,
    );
    const undelegateTxs = coreTxDelegate.args.transactions?.filter(
      (tx: Transaction) => TransactionType.UNDELEGATE === tx.type,
    );

    coreTxs = delegateTxs?.length > 0 ? delegateTxs : undelegateTxs;
  } else if (isDelegateTransaction(coreTxDelegate) || isUndelegateTransaction(coreTxDelegate)) {
    coreTxs = [coreTxDelegate];
  }

  if (!coreTxs || coreTxs.length === 0) return;

  return coreTxs.map((tx: Transaction) => tx.args.track?.toString());
};

export const getUndelegationData = (
  api: ApiPromise,
  tx: MultisigOperation,
): Promise<{ votes: string | undefined; target: AccountId | undefined }> => {
  const coreTxDelegate = getCoreTx(tx);
  const emptyResult = { votes: undefined, target: undefined };

  if (!coreTxDelegate || !api) {
    return Promise.resolve(emptyResult);
  }

  let coreTx;

  if (coreTxDelegate.type === TransactionType.BATCH_ALL) {
    coreTx = coreTxDelegate.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.UNDELEGATE);
  } else if (isUndelegateTransaction(coreTxDelegate)) {
    coreTx = coreTxDelegate;
  }

  if (!coreTx) {
    return Promise.resolve(emptyResult);
  }

  return convictionVotingPallet.storage.votingFor(api, [[coreTx.address, coreTx.args.track]]).then((votes) => {
    const delegation = votes.find((vote) => vote.type === 'Delegating');

    if (!delegation) return emptyResult;

    return {
      votes: votingService.calculateVotingPower(delegation.data.balance, delegation.data.conviction).toString(),
      target: delegation.data.target,
    };
  });
};

export const getReferendumId = (tx: MultisigOperation): string | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.referendum;
};

export const getVote = (tx: MultisigOperation): TransactionVote | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.vote;
};

export const getCoreTx = (tx: MultisigOperation): Transaction | DecodedTransaction | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction;
  }

  return tx.transaction;
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
