import { Transaction, TransactionType } from '../model/transaction';
import { TransferType } from './common/constants';
import { toAddress, TEST_ACCOUNTS, formatAmount, getAssetId } from '@shared/lib/utils';
import { Chain, ChainId, Asset, AccountId, Address } from '@shared/core';

export const transactionBuilder = {
  buildTransfer,
  buildUnstake,
  buildBondNominate,
  buildBondExtra,
  buildNominate,
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
  const payeeAddress = toAddress(destination, { prefix: chain.addressPrefix });

  return {
    chainId: chain.chainId,
    address: controller,
    type: TransactionType.BOND,
    args: {
      value: formatAmount(amount, asset.precision),
      controller,
      payee: destination ? { Account: payeeAddress } : 'Staked',
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

type UnstakeParams = {
  chain: Chain;
  asset: Asset;
  accountId: AccountId;
  amount: string;
  chill?: boolean;
};
function buildUnstake({ chain, accountId, asset, amount, chill }: UnstakeParams): Transaction {
  const address = toAddress(accountId, { prefix: chain.addressPrefix });

  const unstakeTx: Transaction = {
    chainId: chain.chainId,
    address,
    type: TransactionType.UNSTAKE,
    args: {
      value: formatAmount(amount, asset.precision),
    },
  };

  if (!chill) return unstakeTx;

  return buildBatchAll({
    chain,
    accountId,
    transactions: [buildChill({ chain, accountId }), unstakeTx],
  });
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
