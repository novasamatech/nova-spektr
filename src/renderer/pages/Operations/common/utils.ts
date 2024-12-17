import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import {
  type Account,
  type AccountId,
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
import { toAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
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
    return collection.find((c) => c?.accountId === signatoryId);
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
  const walletsMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));

  return signatories.reduce((acc: Account[], signatory) => {
    const filteredAccounts = accounts.filter(
      (a) => a.accountId === signatory.accountId && !events.some((e) => e.accountId === a.accountId),
    );

    const signatoryAccount = filteredAccounts.find((a) => {
      const isChainMatch = accountUtils.isChainIdMatch(a, chainId);
      const wallet = walletsMap.get(a.walletId);

      return isChainMatch && walletUtils.isValidSignatory(wallet);
    });

    if (signatoryAccount) {
      acc.push(signatoryAccount);
    } else {
      const legacySignatoryAccount = filteredAccounts.find(
        (a) => accountUtils.isChainAccount(a) && a.chainId === chainId,
      );
      if (legacySignatoryAccount) {
        acc.push(legacySignatoryAccount);
      }
    }

    return acc;
  }, []);
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

export const getPayee = (tx: MultisigTransaction): { Account: Address } | string | undefined => {
  if (!tx.transaction) return undefined;

  const args = isProxyTransaction(tx.transaction) ? tx.transaction.args.transaction.args : tx.transaction.args;

  if (tx.transaction.type === TransactionType.BATCH_ALL) {
    return args.transactions.at(0).args.payee;
  }

  return args.payee;
};

export const getDelegate = (tx: MultisigTransaction): Address | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.delegate;
  }

  return tx.transaction.args.delegate;
};

export const getDestinationChain = (tx: MultisigTransaction): ChainId | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.destinationChain;
  }

  return tx.transaction.args.destinationChain;
};

export const getSender = (tx: MultisigTransaction): Address | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.real;
  }

  return tx.transaction.address;
};

export const getSpawner = (tx: MultisigTransaction): AccountId | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.spawner;
  }

  return tx.transaction.args.spawner;
};

export const getProxyType = (tx: MultisigTransaction): ProxyType | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.proxyType;
  }

  return tx.transaction.args.proxyType;
};

export const getDelegationVotes = (tx: MultisigTransaction): string | undefined => {
  if (!tx.transaction) return undefined;

  let coreTx;

  if (isProxyTransaction(tx.transaction)) {
    coreTx = tx.transaction.args.transaction;
  } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
    coreTx = tx.transaction.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
  } else if (isDelegateTransaction(tx.transaction)) {
    coreTx = tx.transaction;
  }

  if (!coreTx) return;

  const balance = new BN(coreTx.args.balance || 0);
  const conviction = new BN(votingService.getConvictionMultiplier(coreTx.args.conviction) || 0);

  return balance.mul(conviction).toString();
};

export const getDelegationTarget = (tx: MultisigTransaction): string | undefined => {
  if (!tx.transaction) return undefined;

  let coreTx;

  if (isProxyTransaction(tx.transaction)) {
    coreTx = tx.transaction.args.transaction;
  } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
    coreTx = tx.transaction.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
  } else if (isDelegateTransaction(tx.transaction)) {
    coreTx = tx.transaction;
  }

  return coreTx?.args.target;
};

export const getDelegationTracks = (tx: MultisigTransaction): string[] | undefined => {
  if (!tx.transaction) return undefined;

  let coreTxs;

  if (isProxyTransaction(tx.transaction)) {
    coreTxs = [tx.transaction.args.transaction];
  } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
    const delegateTxs = tx.transaction.args.transactions?.filter(
      (tx: Transaction) => TransactionType.DELEGATE === tx.type,
    );
    const undelegateTxs = tx.transaction.args.transactions?.filter(
      (tx: Transaction) => TransactionType.UNDELEGATE === tx.type,
    );

    coreTxs = delegateTxs?.length > 0 ? delegateTxs : undelegateTxs;
  } else if (isDelegateTransaction(tx.transaction) || isUndelegateTransaction(tx.transaction)) {
    coreTxs = [tx.transaction];
  }

  if (!coreTxs || coreTxs.length === 0) return;

  return coreTxs.map((tx: Transaction) => tx.args.track?.toString());
};

export const getUndelegationData = async (
  api: ApiPromise,
  tx: MultisigTransaction,
): Promise<{ votes: string | undefined; target: string | undefined }> => {
  if (!tx.transaction || !api) return { votes: undefined, target: undefined };

  let coreTx;

  if (isProxyTransaction(tx.transaction)) {
    coreTx = tx.transaction.args.transaction;
  } else if (tx.transaction.type === TransactionType.BATCH_ALL) {
    coreTx = tx.transaction.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.UNDELEGATE);
  } else if (isUndelegateTransaction(tx.transaction)) {
    coreTx = tx.transaction;
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

export const getReferendumId = (tx: MultisigTransaction): string | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.referendum;
};

export const getVote = (tx: MultisigTransaction): TransactionVote | undefined => {
  const coreTx = getCoreTx(tx);

  return coreTx?.args.vote;
};

const getCoreTx = (tx: MultisigTransaction): Transaction | DecodedTransaction | undefined => {
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
