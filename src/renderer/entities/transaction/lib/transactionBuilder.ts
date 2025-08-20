import { type Weight } from '@polkadot/types/interfaces';
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
import { formatAmount, getAssetId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';
import { type RevoteTransaction, type TransactionVote, type VoteTransaction } from '@/entities/governance';

import { TransferType } from './common/constants';

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
  buildApproveMultisigTx,
  buildCreatePureProxy,
  buildCreateFlexibleMultisig,
  buildRemark,
  buildAddProxy,
  buildKillPureProxy,
  buildRemoveProxy,

  buildBatchAll,
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
      deliveryFee: string;
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
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.BOND,
    args: {
      value: formatAmount(amount, asset.precision),
      controller: accountId,
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
  nominators: AccountId[];
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

type DelegateParams = {
  chain: Chain;
  accountId: AccountId;
  tracks: number[];
  target: AccountId;
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
  target: AccountId;
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
        target,
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
  otherSignatories: AccountId[];
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

type ApproveMultisigTxParams = {
  chain: Chain;
  signerAccountId: AccountId;
  threshold: number;
  otherSignatories: AccountId[];
  tx: MultisigOperation;
  hasCallData: boolean;
  maxWeight: Weight;
};

function buildApproveMultisigTx({
  chain,
  signerAccountId,
  threshold,
  otherSignatories,
  tx,
  hasCallData,
  maxWeight,
}: ApproveMultisigTxParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: signerAccountId,
    type: hasCallData ? TransactionType.MULTISIG_AS_MULTI : TransactionType.MULTISIG_APPROVE_AS_MULTI,
    args: {
      threshold: threshold,
      otherSignatories,
      maxWeight,
      maybeTimepoint: {
        height: tx.blockCreated,
        index: tx.indexCreated,
      },
      call: tx.callData,
      callHash: tx.callHash,
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
    accountId: accountId,
    type: TransactionType.CREATE_PURE_PROXY,
    args: { proxyType: 'Any', delay: 0, index: 0 },
  };
}

type AddProxyParams = {
  chain: Chain;
  accountId: AccountId;
  delegateAccountId: AccountId | Address;
  type: ProxyType;
};

function buildAddProxy({ chain, accountId, delegateAccountId, type }: AddProxyParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.ADD_PROXY,
    args: {
      delegate: delegateAccountId,
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
  isMultisigExists?: boolean;
};

function buildCreateFlexibleMultisig({
  chain,
  multisigAccountId,
  proxyAccountId,
  threshold,
  signatories,
  signerAccountId,
  proxyDeposit,
  isMultisigExists,
}: CreateFlexibleMultisigParams): Transaction {
  // transfer deposit to proxy account
  const transferTransaction = {
    chainId: chain.chainId,
    accountId: signerAccountId,
    type: TransactionType.TRANSFER,
    args: {
      dest: proxyAccountId,
      value: proxyDeposit,
    },
  };

  // reassign proxy to multisig account
  const addProxyTx = transactionBuilder.buildAddProxy({
    chain,
    accountId: signerAccountId,
    delegateAccountId: multisigAccountId,
    type: 'Any',
  });

  const wrapperAdd = {
    chainId: chain.chainId,
    accountId: signerAccountId,
    type: TransactionType.PROXY,
    args: {
      real: proxyAccountId,
      forceProxyType: 'Any',
      transaction: addProxyTx,
    },
  };

  const removeProxyTx = transactionBuilder.buildRemoveProxy({
    chain,
    accountId: signerAccountId,
    delegate: signerAccountId,
    proxyType: 'Any',
    delay: 0,
  });

  const wrapperRemove = {
    chainId: chain.chainId,
    accountId: signerAccountId,
    type: TransactionType.PROXY,
    args: {
      real: proxyAccountId,
      forceProxyType: 'Any',
      transaction: removeProxyTx,
    },
  };

  let transactions;
  if (isMultisigExists) {
    transactions = [transferTransaction, wrapperAdd, wrapperRemove];
  } else {
    const remarkTx = transactionBuilder.buildRemark({
      chainId: chain.chainId,
      accountId: signerAccountId,
      threshold,
      signatories: signatories.map((s) => s.accountId),
    });

    transactions = [remarkTx, transferTransaction, wrapperAdd, wrapperRemove];
  }

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

type KillPureProxyParams = {
  chain: Chain;
  accountId: AccountId;
  spawner: Address | AccountId;
  proxyType: ProxyType;
  index: number;
  height: number;
  extIndex: number;
};

function buildKillPureProxy({
  chain,
  accountId,
  spawner,
  proxyType,
  index,
  height,
  extIndex,
}: KillPureProxyParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.KILL_PURE_PROXY,
    args: {
      spawner,
      proxyType,
      index,
      height,
      extIndex,
    },
  };
}

type RemoveProxyParams = {
  chain: Chain;
  accountId: AccountId;
  delegate: AccountId;
  proxyType: ProxyType;
  delay: number;
};

function buildRemoveProxy({ chain, accountId, delegate, proxyType, delay }: RemoveProxyParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.REMOVE_PROXY,
    args: {
      delegate,
      proxyType,
      delay,
    },
  };
}
