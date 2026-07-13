import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { type Weight } from '@polkadot/types/interfaces';
import { type BN } from '@polkadot/util';
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
  AssetType,
  TransactionType,
} from '@/shared/core';
import { formatAmount, getAssetId, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type BalancePreservation, type MultisigOperation } from '@/domains/network';
import { type TransactionVote, type VoteTransaction } from '@/entities/governance';

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
  buildRemoveVote,
  buildRemoveVotes,
  buildRejectMultisigTx,
  buildApproveMultisigTx,
  buildCreatePureProxy,
  buildCreateFlexibleMultisig,
  buildProxyReassign,
  buildRemark,
  buildAddProxy,
  buildKillPureProxy,
  buildRemoveProxy,
  buildVestedTransfer,
  buildVest,
  buildMultiTransfer,

  buildBatchAll,
};

type InputMode = 'regular' | 'max';

type TransferParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  destination: string;
  amount: string;
  inputMode: InputMode;
  balancePreservation: BalancePreservation;
  xcmData?: {
    args: {
      destinationChain: ChainId;
      spellExtrinsic?: SubmittableExtrinsic<'promise'>;
      destinationFee?: string;
      originFee?: string;
    };
    transactionType: TransactionType;
  };
};

function isNativeAsset(asset: Asset) {
  return asset.type === AssetType.NATIVE;
}

function getTransactionType(asset: Asset, inputMode: InputMode, balancePreservation: BalancePreservation) {
  if (isNativeAsset(asset)) {
    const allowDeath = inputMode === 'regular' && balancePreservation === 'allowDeath';
    if (allowDeath) {
      return TransactionType.TRANSFER_ALLOW_DEATH;
    }

    if (inputMode === 'max') {
      return TransactionType.TRANSFER_ALL;
    }
  }

  return TransferType[asset.type] ?? TransactionType.TRANSFER;
}

function buildTransfer({
  chain,
  accountId,
  destination,
  asset,
  amount,
  xcmData,
  balancePreservation,
  inputMode,
}: TransferParams): Transaction {
  const transactionType = xcmData?.transactionType ?? getTransactionType(asset, inputMode, balancePreservation);
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
      keepAlive: balancePreservation === 'keepAlive',
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

type Staked = 'Staked';
type Payout = { destination: Address };
type RewardDestination = Staked | Payout;

type BondParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  destination: RewardDestination;
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
      payee: destination === 'Staked' ? 'Staked' : { Account: destination.destination },
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

type VestParams = {
  chain: Chain;
  accountId: AccountId;
};
function buildVest({ chain, accountId }: VestParams): Transaction {
  return {
    chainId: chain.chainId,
    accountId: accountId,
    type: TransactionType.VEST,
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

  if (delegateTxs.length === 1) return delegateTxs[0]!;

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

  if (undelegateTxs.length === 1) return undelegateTxs[0]!;

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

  if (unlockTxs.length === 1) return unlockTxs[0]!;

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
    return transactions[0]!;
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
  signatoryAccountId: AccountId;
  multisigAccountId: AccountId;
  proxyAccountId: AccountId;
  proxyType: ProxyType;
  threshold: number;
  pureTopUpAmount: BN;
  signatories: Signatory[];
  isMultisigExists?: boolean;
};

function buildCreateFlexibleMultisig({
  chain,
  multisigAccountId,
  proxyAccountId,
  proxyType,
  threshold,
  signatories,
  signatoryAccountId,
  pureTopUpAmount,
  isMultisigExists,
}: CreateFlexibleMultisigParams): Transaction {
  // transfer deposit to proxy account
  const transferTransaction = {
    chainId: chain.chainId,
    accountId: signatoryAccountId,
    type: TransactionType.TRANSFER,
    args: {
      dest: proxyAccountId,
      value: pureTopUpAmount.toString(),
    },
  };

  // reassign proxy to multisig account
  const addProxyTx = transactionBuilder.buildAddProxy({
    chain,
    accountId: signatoryAccountId,
    delegateAccountId: multisigAccountId,
    type: proxyType,
  });

  const removeProxyTx = transactionBuilder.buildRemoveProxy({
    chain,
    accountId: signatoryAccountId,
    delegate: signatoryAccountId,
    proxyType,
    delay: 0,
  });

  const innerBatch = buildBatchAll({
    chain,
    accountId: signatoryAccountId,
    transactions: [addProxyTx, removeProxyTx],
  });

  const proxyWrapper = {
    chainId: chain.chainId,
    accountId: signatoryAccountId,
    type: TransactionType.PROXY,
    args: {
      real: proxyAccountId,
      forceProxyType: proxyType,
      transaction: innerBatch,
    },
  };

  let transactions;
  if (isMultisigExists) {
    transactions = [transferTransaction, proxyWrapper];
  } else {
    const remarkTx = transactionBuilder.buildRemark({
      chainId: chain.chainId,
      accountId: signatoryAccountId,
      threshold,
      signatories: signatories.map((s) => s.accountId),
    });

    transactions = [transferTransaction, remarkTx, proxyWrapper];
  }

  return buildBatchAll({ chain, accountId: signatoryAccountId, transactions });
}

type ProxyReassignParams = {
  chain: Chain;
  signerAccountId: AccountId;
  newAccountId: AccountId;
  oldAccountId: AccountId;
  proxyType: ProxyType;
};

function buildProxyReassign({
  chain,
  newAccountId,
  oldAccountId,
  signerAccountId,
  proxyType,
}: ProxyReassignParams): Transaction {
  const addProxyTx = transactionBuilder.buildAddProxy({
    chain,
    accountId: oldAccountId,
    delegateAccountId: newAccountId,
    type: proxyType,
  });

  const removeProxyTx = transactionBuilder.buildRemoveProxy({
    chain,
    accountId: oldAccountId,
    delegate: oldAccountId,
    proxyType,
    delay: 0,
  });

  return buildBatchAll({
    chain,
    accountId: signerAccountId,
    transactions: [addProxyTx, removeProxyTx],
  });
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

type VestingSchedule = {
  target: AccountId;
  locked: BN;
  startingBlock: BN;
  perBlock: BN;
  unlockedAtStartBlock?: BN;
};

type VestedTransferParams = {
  chain: Chain;
  accountId: AccountId;
  vestingSchedule: VestingSchedule[];
};

function buildVestedTransfer({ chain, accountId, vestingSchedule }: VestedTransferParams): Transaction {
  const vestingTxs: Transaction[] = [];

  for (const v of vestingSchedule) {
    if (nonNullable(v.unlockedAtStartBlock)) {
      vestingTxs.push({
        chainId: chain.chainId,
        accountId,
        type: TransactionType.VESTED_TRANSFER,
        args: {
          target: v.target,
          locked: v.unlockedAtStartBlock.toString(),
          startingBlock: v.startingBlock.toString(),
          perBlock: v.unlockedAtStartBlock.toString(),
        },
      });

      const remainingLocked = v.locked.sub(v.unlockedAtStartBlock);
      vestingTxs.push({
        chainId: chain.chainId,
        accountId,
        type: TransactionType.VESTED_TRANSFER,
        args: {
          target: v.target,
          locked: remainingLocked.toString(),
          startingBlock: v.startingBlock.toString(),
          perBlock: v.perBlock.toString(),
        },
      });
    } else {
      vestingTxs.push({
        chainId: chain.chainId,
        accountId,
        type: TransactionType.VESTED_TRANSFER,
        args: {
          target: v.target,
          locked: v.locked.toString(),
          startingBlock: v.startingBlock.toString(),
          perBlock: v.perBlock.toString(),
        },
      });
    }
  }

  if (vestingTxs.length === 1) return vestingTxs[0]!;

  return buildBatchAll({ chain, accountId, transactions: vestingTxs });
}

type MultiTransferParams = {
  chain: Chain;
  accountId: AccountId;
  transfers: { recipient: AccountId; amount: BN }[];
};

function buildMultiTransfer({ chain, accountId, transfers }: MultiTransferParams): Transaction {
  const transferTxs = transfers.map((t) => ({
    chainId: chain.chainId,
    accountId,
    type: TransactionType.TRANSFER,
    args: {
      dest: t.recipient,
      value: t.amount.toString(),
    },
  }));

  return buildBatchAll({ chain, accountId, transactions: transferTxs });
}
