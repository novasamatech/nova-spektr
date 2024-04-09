import { Transaction, TransactionType } from '../model/transaction';
import { TransferType } from './common/constants';
import { toAddress, TEST_ACCOUNTS, formatAmount, getAssetId } from '@shared/lib/utils';
import { Chain, ChainId, Asset, AccountId, Address } from '@shared/core';

export const transactionBuilder = {
  buildTransfer,
  buildBondNominate,
  buildBondExtra,
  buildNominate,
  buildRestake,
  buildRedeem,
  buildUnstake,
  buildSetPayee,
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
      payee: destination ? { Account: destination } : 'Staked',
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

type RedeemParams = {
  chain: Chain;
  accountId: AccountId;
  withChill?: boolean;
};
function buildRedeem({ chain, accountId }: RedeemParams): Transaction {
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
  destination?: Address;
};
function buildSetPayee({ chain, accountId, destination }: SetPayeeParams): Transaction {
  return {
    chainId: chain.chainId,
    address: toAddress(accountId, { prefix: chain.addressPrefix }),
    type: TransactionType.DESTINATION,
    args: {
      payee: destination ? { Account: destination } : 'Staked',
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
