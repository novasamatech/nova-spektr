import { Transaction, TransactionType } from '../model/transaction';
import { TransferType } from './common/constants';
import { toAddress, TEST_ACCOUNTS, formatAmount, getAssetId } from '@shared/lib/utils';
import { Chain, ChainId, Asset, AccountId } from '@shared/core';

export const transactionBuilder = {
  buildTransfer,
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
      ...(!asset.type && { asset: getAssetId(asset) }),
      ...xcmData?.args,
    },
  };
}
