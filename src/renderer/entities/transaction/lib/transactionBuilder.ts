import { type ApiPromise } from '@polkadot/api';
import { camelCase } from 'lodash';

import { type ClaimAction } from '@/shared/api/governance';
import { type MultisigTransactionDS } from '@/shared/api/storage';
import {
  type Account,
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type Conviction,
  type MultisigAccount,
  type ReferendumId,
  type TrackId,
  type Transaction,
  TransactionType,
  WrapperKind,
} from '@/shared/core';
import { TEST_ACCOUNTS, formatAmount, getAssetId, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type RevoteTransaction, type TransactionVote, type VoteTransaction } from '@/entities/governance';

import { TransferType } from './common/constants';
import { transactionService } from './transactionService';

export const transactionBuilder = {
  buildTransfer,
  buildBondNominate,
  buildBondExtra,
  buildNominate,
  buildRestake,
  buildWithdraw,
  buildUnstake,
  buildSetPayee,
  buildDelegate,
  buildUndelegate,
  buildEditDelegation,
  buildUnlock,
  buildVote,
  buildRevote,
  buildRemoveVote,
  buildRemoveVotes,
  buildRejectMultisigTx,
  buildCreatePureProxy,
  buildCreateFlexibleMultisig,

  buildBatchAll,
  splitBatchAll,
};

type TransferParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  destination: string;
  amount: string;
  xcmData?: {
    args: {
      xcmFee: string;
      xcmAsset?: NonNullable<unknown>;
      xcmWeight: string;
      xcmDest?: NonNullable<unknown>;
      xcmBeneficiary?: NonNullable<unknown>;
      destinationChain: ChainId;
    };
    transactionType: TransactionType;
  };
};
function buildTransfer({ chain, accountId, destination, asset, amount, xcmData }: TransferParams): Transaction {
  let transactionType = asset.type ? TransferType[asset.type] : TransactionType.TRANSFER;
  if (xcmData) {
    transactionType = xcmData.transactionType;
  }

  const palletName =
    asset.typeExtras && 'palletName' in asset.typeExtras ? camelCase(asset.typeExtras.palletName) : 'assets';

  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: transactionType,
    args: {
      palletName,
      dest: toAddress(destination || TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
      value: formatAmount(amount, asset.precision) || '1',
      ...(Boolean(asset.type) && { asset: getAssetId(asset) }),
      ...xcmData?.args,
    },
  };
}

type BondNominateParams = BondParams & NominateParams;
function buildBondNominate({
  chain,
  accountId,
  destination,
  asset,
  amount,
  nominators,
}: BondNominateParams): Transaction {
  const bondTx = buildBond({ chain, asset, accountId, destination, amount });
  const nominateTx = buildNominate({ chain, accountId, nominators });

  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.BATCH_ALL,
    args: { transactions: [bondTx, nominateTx] },
  };
}

type BondParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  destination: Address;
  amount: string;
};
function buildBond({ chain, asset, accountId, destination, amount }: BondParams): Transaction {
  const controller = toAddress(accountId, { prefix: chain.addressPrefix });

  return {
    chainId: chain.chainId,
    address: controller,
    type: TransactionType.BOND,
    args: {
      value: formatAmount(amount, asset.precision),
      controller,
      payee: destination === '' ? 'Staked' : { Account: destination },
    },
  };
}

function buildBondExtra({ chain, asset, accountId, amount }: Omit<BondParams, 'destination'>): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.STAKE_MORE,
    args: {
      maxAdditional: formatAmount(amount, asset.precision),
    },
  };
}

type NominateParams = {
  chain: Chain;
  accountId: AccountId;
  nominators: Address[];
};
function buildNominate({ chain, accountId, nominators }: NominateParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.NOMINATE,
    args: { targets: nominators },
  };
}

type WithdrawParams = {
  chain: Chain;
  accountId: AccountId;
};
function buildWithdraw({ chain, accountId }: WithdrawParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.REDEEM,
    args: {
      numSlashingSpans: 1,
    },
  };
}

type UnstakeParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  amount: string;
  withChill?: boolean;
};
function buildUnstake({ chain, accountId, asset, amount, withChill }: UnstakeParams): Transaction {
  const address = toAddress(accountId, { prefix: chain.addressPrefix });

  const unstakeTx: Transaction = {
    chainId: chain.chainId,
    address,
    type: TransactionType.UNSTAKE,
    args: {
      value: formatAmount(amount, asset.precision),
    },
  };

  if (!withChill) return unstakeTx;

  return buildBatchAll({
    chain,
    accountId,
    transactions: [buildChill({ chain, accountId }), unstakeTx],
  });
}

type RestakeParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  amount: string;
};
function buildRestake({ chain, accountId, asset, amount }: RestakeParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.RESTAKE,
    args: {
      value: formatAmount(amount, asset.precision),
    },
  };
}

type SetPayeeParams = {
  chain: Chain;
  accountId: AccountId;
  destination: Address;
};
function buildSetPayee({ chain, accountId, destination }: SetPayeeParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.DESTINATION,
    args: {
      payee: destination === '' ? 'Staked' : { Account: destination },
    },
  };
}

type ChillParams = {
  chain: Chain;
  accountId: AccountId;
};
function buildChill({ chain, accountId }: ChillParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.CHILL,
    args: {},
  };
}

type BatchParams = {
  chain: Chain;
  accountId: AccountId;
  transactions: Transaction[];
};
function buildBatchAll({ chain, accountId, transactions }: BatchParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.BATCH_ALL,
    args: { transactions },
  };
}

type SplitBatchAllParams = { transaction: Transaction; chain: Chain; api: ApiPromise };

async function splitBatchAll({ transaction, chain, api }: SplitBatchAllParams): Promise<Transaction[] | Transaction> {
  if (transaction.type !== TransactionType.BATCH_ALL) {
    return transaction;
  }

  const splittedTxs = await transactionService.splitTxsByWeight(api, transaction.args.transactions);

  return splittedTxs.map((transactions) =>
    buildBatchAll({ chain, accountId: toAccountId(transaction.address), transactions }),
  );
}

type DelegateParams = {
  chain: Chain;
  accountId: AccountId;
  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;
};

function buildDelegate({ chain, accountId, tracks, target, conviction, balance }: DelegateParams): Transaction {
  const delegateTxs = tracks.map((track) => ({
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.DELEGATE,
    args: {
      track,
      target,
      conviction,
      balance,
    },
  }));

  if (delegateTxs.length === 1) return delegateTxs[0];

  return buildBatchAll({ chain, accountId, transactions: delegateTxs });
}

type UndelegateParams = {
  chain: Chain;
  accountId: AccountId;
  tracks: number[];
};

function buildUndelegate({ chain, accountId, tracks }: UndelegateParams): Transaction {
  const undelegateTxs = tracks.map((track) => ({
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.UNDELEGATE,
    args: {
      track,
    },
  }));

  if (undelegateTxs.length === 1) return undelegateTxs[0];

  return buildBatchAll({ chain, accountId, transactions: undelegateTxs });
}

type EditDelegationParams = {
  chain: Chain;
  accountId: AccountId;
  tracks: number[];
  undelegateTracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;
};

function buildEditDelegation({
  chain,
  accountId,
  tracks,
  undelegateTracks,
  target,
  conviction,
  balance,
}: EditDelegationParams): Transaction {
  const undelegateTxs = undelegateTracks.map((track) => ({
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.UNDELEGATE,
    args: {
      track,
    },
  }));

  const delegateTxs = tracks.map((track) => ({
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.DELEGATE,
    args: {
      track,
      target,
      conviction,
      balance,
    },
  }));

  return buildBatchAll({ chain, accountId, transactions: [...undelegateTxs, ...delegateTxs] });
}

type UnlockParams = {
  chain: Chain;
  accountId: AccountId;
  actions: ClaimAction[];
  amount: string;
};

function buildUnlock({ chain, accountId, actions, amount: value }: UnlockParams): Transaction {
  const unlockTxs = actions.map((action) => {
    const transaction = {
      chainId: chain.chainId,
      address: toAddress(accountId, { prefix: chain.addressPrefix }),
    };

    if (action.type === 'remove_vote') {
      return {
        ...transaction,
        type: TransactionType.REMOVE_VOTE,
        args: {
          track: action.trackId,
          referendum: action.referendumId,
          value,
        },
      };
    }

    return {
      ...transaction,
      type: TransactionType.UNLOCK,
      args: {
        trackId: action.trackId,
        target: toAddress(accountId, { prefix: chain.addressPrefix }),
        value,
      },
    };
  });

  if (unlockTxs.length === 1) return unlockTxs[0];

  return buildBatchAll({ chain, accountId, transactions: unlockTxs });
}

type VoteParams = {
  chain: Chain;
  accountId: AccountId;
  trackId: TrackId;
  referendumId: ReferendumId;
  vote: TransactionVote;
};

function buildVote({ chain, accountId, referendumId, trackId, vote }: VoteParams): VoteTransaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.VOTE,
    args: {
      track: trackId,
      referendum: referendumId,
      vote,
    },
  };
}

type RevoteParams = {
  chain: Chain;
  accountId: AccountId;
  trackId: TrackId;
  referendumId: ReferendumId;
  vote: TransactionVote;
};

function buildRevote({ chain, accountId, referendumId, trackId, vote }: RevoteParams): RevoteTransaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.REVOTE,
    args: {
      track: trackId,
      referendum: referendumId,
      vote,
    },
  };
}

type RemoveVoteParams = {
  chain: Chain;
  accountId: AccountId;
  referendum: ReferendumId;
  track: TrackId;
};

function buildRemoveVote({ chain, accountId, track, referendum }: RemoveVoteParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.REMOVE_VOTE,
    args: { track, referendum },
  };
}

type RemoveVotesParams = {
  chain: Chain;
  accountId: AccountId;
  votes: {
    referendum: ReferendumId;
    track: TrackId;
  }[];
};

function buildRemoveVotes({ chain, accountId, votes }: RemoveVotesParams): Transaction {
  const transactions = votes.map(({ referendum, track }) =>
    buildRemoveVote({
      chain,
      accountId,
      track,
      referendum,
    }),
  );

  if (transactions.length === 1) {
    return transactions[0];
  }

  return buildBatchAll({ chain, accountId, transactions });
}
type RejectTxParams = {
  chain: Chain;
  signerAddress: Address;
  threshold: number;
  otherSignatories: Address[];
  tx: MultisigTransactionDS;
};
function buildRejectMultisigTx({ chain, signerAddress, threshold, otherSignatories, tx }: RejectTxParams): Transaction {
  return {
    chainId: chain.chainId,
    address: signerAddress,
    type: TransactionType.MULTISIG_CANCEL_AS_MULTI,
    args: {
      threshold: threshold,
      otherSignatories,
      callHash: tx.callHash,
      maybeTimepoint: {
        height: tx.blockCreated,
        index: tx.indexCreated,
      },
    },
  };
}

type CreateProxyPureParams = {
  chain: Chain;
  accountId: AccountId;
};

function buildCreatePureProxy({ chain, accountId }: CreateProxyPureParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.CREATE_PURE_PROXY,
    args: { proxyType: 'Any', delay: 0, index: 0 },
  };
}

type CreateFlexibleMultisigParams = {
  chain: Chain;
  signer: Account;
  api: ApiPromise;
  multisigAccountId: AccountId;
  threshold: number;
  proxyDeposit: string;
  signatories: {
    accountId: AccountId;
    address: Address;
  }[];
};

function buildCreateFlexibleMultisig({
  api,
  chain,
  multisigAccountId,
  threshold,
  signatories,
  signer,
  proxyDeposit,
}: CreateFlexibleMultisigParams): Transaction {
  const proxyTransaction = transactionBuilder.buildCreatePureProxy({
    chain: chain,
    accountId: signer.accountId,
  });

  const wrappedTransaction = transactionService.getWrappedTransaction({
    api: api,
    addressPrefix: chain.addressPrefix,
    transaction: proxyTransaction,
    txWrappers: [
      {
        kind: WrapperKind.MULTISIG,
        multisigAccount: {
          accountId: multisigAccountId,
          signatories,
          threshold,
        } as MultisigAccount,
        signatories: signatories.map((s) => ({
          accountId: toAccountId(s.address),
        })) as Account[],
        signer,
      },
    ],
  });

  const transferTransaction = {
    chainId: chain.chainId,
    address: toAddress(signer.accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.TRANSFER,
    args: {
      dest: toAddress(multisigAccountId, { prefix: chain.addressPrefix }),
      value: proxyDeposit,
    },
  };

  const transactions = [wrappedTransaction.wrappedTx, transferTransaction];

  return buildBatchAll({ chain, accountId: signer.accountId, transactions });
}
