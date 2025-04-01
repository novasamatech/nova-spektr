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
  type Wallet,
} from '@/shared/core';
import { dictionary, nonNullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { convictionVotingPallet } from '@/shared/pallet/convictionVoting';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type AnyDecodedTransaction,
  type MultisigEvent,
  accountService,
  transactionService,
} from '@/domains/network';
import { type TransactionVote, votingService } from '@/entities/governance';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { types } from '@/features/transaction-decoder';

const unwrap = <T extends AnyDecodedTransaction>(
  t: AnyDecodedTransaction,
  predicate: (t: AnyDecodedTransaction) => t is T,
): T | null => {
  if (transactionService.isBatchTransaction(t)) {
    return t.args.calls.find(predicate) ?? null;
  }
  if (predicate(t)) {
    return t;
  }
  return null;
};

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
  return unwrap(transaction, (t) => {
    return types.isAddProxyTransaction(t) || types.isRemoveProxyTransaction(t);
  })?.args.delegate;
};

export const getSpawner = (transaction: AnyDecodedTransaction): AccountId | undefined => {
  return unwrap(transaction, types.isKillPureProxyTransaction)?.args?.spawner;
};

export const getProxyType = (transaction: AnyDecodedTransaction): ProxyType | undefined => {
  return unwrap(transaction, (t) => {
    return (
      types.isAddProxyTransaction(t) ||
      types.isRemoveProxyTransaction(t) ||
      types.isCreatePureProxyTransaction(t) ||
      types.isKillPureProxyTransaction(t)
    );
  })?.args?.proxyType;
};

export const getDelegationVotes = (transaction: AnyDecodedTransaction): string | undefined => {
  const unwrapped = unwrap(transaction, types.isConvictionVotingDelegateTransaction);
  if (unwrapped) {
    const balance = new BN(unwrapped.args.balance || 0);
    const conviction = new BN(votingService.getConvictionMultiplier(unwrapped.args.conviction) || 0);
    return balance.mul(conviction).toString();
  }
};

export const getDelegationTarget = (transaction: AnyDecodedTransaction): string | undefined => {
  const unwrapped = unwrap(
    transaction,
    (t) => types.isConvictionVotingDelegateTransaction(t) || types.isConvictionVotingUnlockTransaction(t),
  );
  return unwrapped?.args?.target;
};

export const getDelegationTracks = (transaction: AnyDecodedTransaction): string[] => {
  const unwrappedDelegate = unwrap(transaction, types.isConvictionVotingDelegateTransaction);
  const unwrappedUndelegate = unwrap(transaction, types.isConvictionVotingDelegateTransaction);
  return (unwrappedDelegate ? [unwrappedDelegate] : [unwrappedUndelegate])
    .filter(nonNullable)
    .map((t) => t.args.track.toString());
};

export const getUndelegationData = async (
  api: ApiPromise,
  transaction: AnyDecodedTransaction,
): Promise<{ votes: string | undefined; target: string | undefined }> => {
  const coreTx = unwrap(transaction, types.isConvictionVotingDelegateTransaction);
  if (!coreTx) return { votes: undefined, target: undefined };

  const votes = await convictionVotingPallet.storage.votingFor(api, [[coreTx.args.target, coreTx.args.track]]);
  const delegation = votes.find((vote) => vote.type === 'Delegating');

  return {
    votes:
      delegation && votingService.calculateVotingPower(delegation.data.balance, delegation.data.conviction).toString(),
    target: delegation && toAddress(delegation.data.target),
  };
};

export const getReferendumId = (tx: AnyDecodedTransaction): string | undefined => {
  const coreTx = unwrap(tx, types.isConvictionVotingVoteTransaction);

  return coreTx?.args?.referendum.toString();
};

export const getVote = (tx: AnyDecodedTransaction): TransactionVote | undefined => {
  const coreTx = unwrap(tx, types.isConvictionVotingVoteTransaction);
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
