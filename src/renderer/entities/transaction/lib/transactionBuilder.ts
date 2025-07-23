import { type ApiPromise } from '@polkadot/api';
import { camelCase } from 'lodash';

import { type ClaimAction } from '@/shared/api/governance';
import {
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type Conviction,
  type ProxyType,
  type ReferendumId,
  type Signatory,
  type TrackId,
  type Transaction,
  TransactionType,
} from '@/shared/core';
import { formatAmount, getAssetId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';
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
  buildRejectFlexibleMultisigTx,
  buildCreatePureProxy,
  buildCreateFlexibleMultisig,
  buildRemark,
  buildAddProxy,

  buildBatchAll,
  splitBatchAll,
};

type TransferParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  destination: string;
  amount: string;
  transferAll?: boolean;
  xcmData?: {
    args: {
      xcmFee: string;
      deliveryFee: string | null;
      xcmAsset?: NonNullable<unknown>;
      xcmWeight: string;
      xcmDest?: NonNullable<unknown>;
      xcmBeneficiary?: NonNullable<unknown>;
      destinationChain: ChainId;
    };
    transactionType: TransactionType;
  };
};
function buildTransfer({
  chain,
  accountId,
  destination,
  asset,
  amount,
  xcmData,
  transferAll,
}: TransferParams): Transaction {
  let transactionType = asset.type ? TransferType[asset.type] : TransactionType.TRANSFER;
  if (xcmData) {
    transactionType = xcmData.transactionType;
  }
  if (transferAll) {
    transactionType = TransactionType.TRANSFER_ALL;
  }

  const palletName =
    asset.typeExtras && 'palletName' in asset.typeExtras ? camelCase(asset.typeExtras.palletName) : 'assets';

  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: transactionType,
    args: {
      palletName,
      dest: destination,
      value: formatAmount(amount, asset.precision),
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
  const unstakeTx: Transaction = {
    chainId: chain.chainId,
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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

  return splittedTxs.map((transactions) => buildBatchAll({ chain, accountId: transaction.accountId, transactions }));
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
    accountId,
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
    accountId: accountId,
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
  previousConviction: Conviction;
  balance: string;
};

function buildEditDelegation({
  chain,
  accountId,
  tracks,
  undelegateTracks,
  target,
  conviction,
  previousConviction,
  balance,
}: EditDelegationParams): Transaction {
  const undelegateTxs = undelegateTracks.map((track) => ({
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.UNDELEGATE,
    args: {
      track,
    },
  }));

  const delegateTxs = tracks.map((track) => ({
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.DELEGATE,
    args: {
      track,
      target,
      conviction,
      previousConviction,
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
  target: AccountId;
};

function buildUnlock({ chain, accountId, actions, amount: value, target }: UnlockParams): Transaction {
  const unlockTxs = actions.map((action) => {
    const transaction = {
      chainId: chain.chainId,
      accountId: accountId,
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
        target: toAddress(target, { prefix: chain.addressPrefix }),
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
    accountId: accountId,
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
    accountId: accountId,
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
    accountId: accountId,
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
  signerAccountId: AccountId;
  threshold: number;
  otherSignatories: Address[];
  tx: MultisigOperation;
};

function buildRejectMultisigTx({
  chain,
  signerAccountId,
  threshold,
  otherSignatories,
  tx,
}: RejectTxParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: signerAccountId,
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

type RejectFlexibleTxParams = RejectTxParams & {
  accountId: AccountId;
  transaction: Transaction;
};

function buildRejectFlexibleMultisigTx({
  chain,
  signerAccountId,
  otherSignatories,
  transaction,
  threshold,
  tx,
}: RejectFlexibleTxParams): Transaction {
  const asset = chain.assets.at(0);
  if (!asset) throw new Error('Asset not found');

  const rejectTx = buildRejectMultisigTx({
    chain,
    signerAccountId,
    threshold,
    otherSignatories,
    tx,
  });

  return buildBatchAll({
    chain,
    accountId: signerAccountId,
    transactions: [rejectTx, transaction],
  });
}

type CreateProxyPureParams = {
  chain: Chain;
  accountId: AccountId;
};

function buildCreatePureProxy({ chain, accountId }: CreateProxyPureParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.CREATE_PURE_PROXY,
    args: { proxyType: 'Any', delay: 0, index: 0 },
  };
}

type AddProxyParams = {
  chain: Chain;
  accountId: AccountId;
  delegateAccountId: AccountId;
  type: ProxyType;
};

function buildAddProxy({ chain, accountId, delegateAccountId, type }: AddProxyParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.ADD_PROXY,
    args: {
      delegate: toAddress(delegateAccountId, { prefix: chain.addressPrefix }),
      proxyType: type,
      delay: 0,
    },
  };
}

type CreateFlexibleMultisigParams = {
  chain: Chain;
  signerAccountId: AccountId;
  multisigAccountId: AccountId;
  proxyAccountId: AccountId;
  threshold: number;
  proxyDeposit: string;
  signatories: Signatory[];
};

function buildCreateFlexibleMultisig({
  chain,
  multisigAccountId,
  proxyAccountId,
  threshold,
  signatories,
  signerAccountId,
  proxyDeposit,
}: CreateFlexibleMultisigParams): Transaction {
  //TODO: reassign
  const proxyTx = transactionBuilder.buildAddProxy({
    chain,
    accountId: signerAccountId,
    delegateAccountId: multisigAccountId,
    type: 'Any',
  });

  const remarkTx = transactionBuilder.buildRemark({
    chainId: chain.chainId,
    accountId: signerAccountId,
    threshold: threshold || 2,
    signatories: signatories.map((s) => s.accountId),
  });

  const transferTransaction = {
    chainId: chain.chainId,
    accountId: signerAccountId,
    type: TransactionType.TRANSFER,
    args: {
      dest: toAddress(proxyAccountId, { prefix: chain.addressPrefix }),
      value: proxyDeposit,
    },
  };

  const transactions = [transferTransaction, remarkTx, proxyTx];

  return buildBatchAll({ chain, accountId: signerAccountId, transactions });
}

type RemarkParams = {
  chainId: ChainId;
  accountId: AccountId;
  threshold: number;
  signatories: AccountId[];
};

function buildRemark({ chainId, accountId, threshold, signatories }: RemarkParams): Transaction {
  return {
    chainId,
    accountId,
    type: TransactionType.REMARK_WITH_EVENT,
    args: {
      remark: JSON.stringify({
        signatories,
        threshold,
      }),
    },
  };
}
