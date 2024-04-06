import { Transaction, TransactionType } from '../model/transaction';
import { TransferType } from './common/constants';
import { toAddress, TEST_ACCOUNTS, formatAmount, getAssetId } from '@shared/lib/utils';
import { Chain, ChainId, Asset, AccountId } from '@shared/core';

export const transactionBuilder = {
  buildTransfer,
  buildUnstake,
  buildRedeem,
  buildChill,
  buildBatchAll,
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
      xcmAsset?: Object;
      xcmWeight: string;
      xcmDest?: Object;
      xcmBeneficiary?: Object;
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

type RedeemParams = {
  chain: Chain;
  accountId: AccountId;
  withChill?: boolean;
};
function buildRedeem({ chain, accountId }: RedeemParams): Transaction {
  const address = toAddress(accountId, { prefix: chain.addressPrefix });

  const redeemTx: Transaction = {
    chainId: chain.chainId,
    address,
    type: TransactionType.REDEEM,
    args: {
      numSlashingSpans: 1,
    },
  };

  return redeemTx;
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
