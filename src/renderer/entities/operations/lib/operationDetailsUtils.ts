import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import {
  type Address,
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
import { dictionary, toAccountId, toAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigEvent,
  type MultisigOperation,
  type MultisigOperationData,
  accountService,
} from '@/domains/network';
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

export const getDestination = (
  tx: MultisigOperation,
  chains: Record<ChainId, Chain>,
  destinationChain?: ChainId,
): Address | undefined => {
  const transaction = getOperationData(tx);
  if (!transaction?.args) return undefined;

  const chain = destinationChain ? chains[destinationChain] : chains[tx.chainId];

  return toAddress(toAccountId(transaction?.args?.dest.Id), { prefix: chain.addressPrefix });
};

export const getDestinationAccountId = (tx: MultisigOperation): AccountId | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return toAccountId(coreTx.args?.dest.Id);
};

export const getPayee = (tx: MultisigOperation): { Account: Address } | string | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx || !coreTx.method || !coreTx.section) return undefined;

  const transactionType = getTransactionType(coreTx.method, coreTx.section);

  if (transactionType === TransactionType.BATCH_ALL) {
    return coreTx.args?.calls.at(0).args.payee;
  }

  return coreTx.args?.payee;
};

export const getDelegate = (tx: MultisigOperation): Address | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.delegate;
};

export const getDestinationChain = (tx: MultisigOperation): ChainId | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.destinationChain;
};

export const getSender = (tx: MultisigOperation): Address | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return tx.accountId;
};

export const getSpawner = (tx: MultisigOperation): AccountId | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.spawner;
};

export const getProxyType = (tx: MultisigOperation): ProxyType | undefined => {
  const coreTx = getOperationData(tx);
  if (!coreTx) return undefined;

  return coreTx.args?.proxyType;
};

export const getDelegationVotes = (tx: MultisigOperation): string | undefined => {
  const txData = getOperationData(tx);
  if (!txData || !txData.method || !txData.section) return undefined;

  const transactionType = getTransactionType(txData.method, txData.section);
  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = txData.args?.calls?.find(
      (operationData: MultisigOperationData) =>
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

export const getDelegationTarget = (tx: MultisigOperation): string | undefined => {
  const txData = getOperationData(tx);
  if (!txData || !txData.method || !txData.section) return undefined;

  const transactionType = getTransactionType(txData.method, txData.section);

  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = txData.args?.calls?.find(
      (operationData: MultisigOperationData) =>
        getTransactionType(operationData.method, operationData.section) === TransactionType.DELEGATE,
    );
  } else if (transactionType === TransactionType.DELEGATE) {
    coreTx = txData;
  }

  return coreTx?.args.target;
};

export const getDelegationTracks = (tx: MultisigOperation): string[] | undefined => {
  const coreTxDelegate = getOperationData(tx);
  if (!coreTxDelegate) return undefined;

  let coreTxs;
  const transactionType = getTransactionType(coreTxDelegate.method, coreTxDelegate.section);

  if (transactionType === TransactionType.BATCH_ALL) {
    const delegateTxs = coreTxDelegate.args?.calls?.filter(
      (operationData: MultisigOperationData) =>
        TransactionType.DELEGATE === getTransactionType(operationData.method, operationData.section),
    );
    const undelegateTxs = coreTxDelegate.args?.calls?.filter(
      (operationData: MultisigOperationData) =>
        TransactionType.UNDELEGATE === getTransactionType(operationData.method, operationData.section),
    );

    coreTxs = delegateTxs?.length > 0 ? delegateTxs : undelegateTxs;
  } else if (transactionType && [TransactionType.DELEGATE, TransactionType.UNDELEGATE].includes(transactionType)) {
    coreTxs = [coreTxDelegate];
  }

  if (!coreTxs || coreTxs.length === 0) return;

  return coreTxs.map((tx: MultisigOperationData) => tx.args?.track?.toString());
};

export const getUndelegationData = async (
  api: ApiPromise,
  tx: MultisigOperation,
): Promise<{ votes: string | undefined; target: string | undefined }> => {
  const txData = getOperationData(tx);
  if (!txData || !txData.method || !txData.section) return { votes: undefined, target: undefined };

  const transactionType = getTransactionType(txData.method, txData.section);

  let coreTx;

  if (transactionType === TransactionType.BATCH_ALL) {
    coreTx = txData.args?.calls?.find(
      (operationData: MultisigOperationData) =>
        getTransactionType(operationData.method, operationData.section) === TransactionType.UNDELEGATE,
    );
  } else if (transactionType === TransactionType.UNDELEGATE) {
    coreTx = txData;
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

export const getReferendumId = (tx: MultisigOperation): string | undefined => {
  const coreTx = getOperationData(tx);

  return coreTx?.args?.referendum;
};

export const getVote = (tx: MultisigOperation): TransactionVote | undefined => {
  const coreTx = getOperationData(tx);

  return coreTx?.args?.vote;
};

export const getOperationData = (tx: MultisigOperationData): MultisigOperationData | undefined => {
  if (!tx.args || !tx.method || !tx.section) return undefined;

  const transactionType = getTransactionType(tx.method, tx.section);

  if (transactionType === TransactionType.PROXY) {
    return getOperationData(tx.args.call);
  }

  return tx;
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
