import { type ClaimAction } from '@/shared/api/governance';
import {
  type AccountId,
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type Transaction,
  TransactionType,
} from '@shared/core';
import { TEST_ACCOUNTS, formatAmount, getAssetId, toAddress } from '@shared/lib/utils';

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

  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: transactionType,
    args: {
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

type DelegateParams = {
  chain: Chain;
  accountId: AccountId;
  tracks: number[];
  target: Address;
  conviction: number;
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
  target: Address;
  conviction: number;
  balance: string;
};

function buildEditDelegation({
  chain,
  accountId,
  tracks,
  target,
  conviction,
  balance,
}: EditDelegationParams): Transaction {
  const undelegateTxs = tracks.map((track) => ({
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
};

function buildUnlock({ chain, accountId, actions }: UnlockParams): Transaction {
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
          trackId: action.trackId,
          referendumId: action.referendumId,
        },
      };
    }

    return {
      ...transaction,
      type: TransactionType.UNLOCK,
      args: {
        trackId: action.trackId,
        target: toAddress(accountId, { prefix: chain.addressPrefix }),
      },
    };
  });

  if (unlockTxs.length === 1) return unlockTxs[0];

  return buildBatchAll({ chain, accountId, transactions: unlockTxs });
}
