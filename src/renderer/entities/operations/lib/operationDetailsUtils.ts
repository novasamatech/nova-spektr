import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import {
  type Account,
  type Address,
  type Chain,
  type ChainId,
  type Contact,
  type DecodedTransaction,
  type Explorer,
  type HexString,
  type MultisigEvent,
  type MultisigTransaction,
  type ProxyType,
  type Signatory,
  type Transaction,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { dictionary, toAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService } from '@/domains/network';
import { type TransactionVote, votingService } from '@/entities/governance';
import { isDelegateTransaction, isProxyTransaction, isUndelegateTransaction } from '@/entities/transaction';
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
  accounts: Account[],
  wallets: Wallet[],
  events: MultisigEvent[],
  signatories: Signatory[],
  chainId: ChainId,
): Account[] => {
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

export const getDestination = (
  tx: MultisigTransaction,
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

export const getDestinationAccountId = (tx: MultisigTransaction): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.dest;
};

export const getPayee = (tx: MultisigTransaction): { Account: Address } | string | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  if (coreTx.type === TransactionType.BATCH_ALL) {
    return coreTx.args.transactions.at(0).args.payee;
  }

  return coreTx.args.payee;
};

export const getDelegate = (tx: MultisigTransaction): Address | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.delegate;
};

export const getDestinationChain = (tx: MultisigTransaction): ChainId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.destinationChain;
};

export const getSender = (tx: MultisigTransaction): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.accountId;
};

export const getSpawner = (tx: MultisigTransaction): AccountId | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.spawner;
};

export const getProxyType = (tx: MultisigTransaction): ProxyType | undefined => {
  const coreTx = getCoreTx(tx);
  if (!coreTx) return undefined;

  return coreTx.args.proxyType;
};

export const getDelegationVotes = (tx: MultisigTransaction): string | undefined => {
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

export const getDelegationTarget = (tx: MultisigTransaction): string | undefined => {
  const coreTxDelegate = getCoreTx(tx);
  if (!coreTxDelegate) return undefined;

  let coreTx;

  if (coreTxDelegate.type === TransactionType.BATCH_ALL) {
    coreTx = coreTxDelegate.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
  } else if (isDelegateTransaction(coreTxDelegate)) {
    coreTx = coreTxDelegate;
  }

  return coreTx?.args.target;
};

export const getDelegationTracks = (tx: MultisigTransaction): string[] | undefined => {
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
  tx: MultisigTransaction,
): Promise<{ votes: string | undefined; target: string | undefined }> => {
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
      target: toAddress(delegation.data.target),
    };
  });
};

export const getReferendumId = (tx: MultisigTransaction): string | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.referendum;
};

export const getVote = (tx: MultisigTransaction): TransactionVote | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.vote;
};

export const getCoreTx = (tx: MultisigTransaction): Transaction | DecodedTransaction | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction;
  }

  return tx.transaction;
};

export const getSignatoryStatus = (events: MultisigEvent[], signatory: AccountId) => {
  const cancelEvent = events.find((e) => e.status === 'CANCELLED' && e.accountId === signatory);
  if (cancelEvent) {
    return cancelEvent.status;
  }

  const signedEvent = events.find((e) => e.status === 'SIGNED' && e.accountId === signatory);
  if (signedEvent) {
    return signedEvent.status;
  }

  return null;
};
