import { type ApiPromise } from '@polkadot/api';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type ChainId } from '@/shared/core';
import { getAssetById } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import { transferConfirmModel } from '@/features/operations/OperationsConfirm';
import { type TransferInput } from '../types/confirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
};

const flow = createGate<BasketTransaction>();

const prepareDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  const xcmChain = chains[transaction.coreTx.args.destinationChain] || chain;
  const asset = getAssetById(transaction.coreTx.args.asset, chain.assets);

  return {
    id: transaction.id,
    xcmChain,
    xcmAsset: asset,
    chain,
    asset: getAssetById(transaction.coreTx.args.asset, chain.assets),
    account,
    amount: transaction.coreTx.args.value,
    destination: transaction.coreTx.args.dest,
    description: '',
    signatory: null,

    fee,
    // TODO: Calculate delivery fee
    deliveryFee: null,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
    coreTx: transaction.coreTx,
  } as TransferInput;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return isTransferTransaction(transaction) || isXcmTransaction(transaction);
  },
  fn: ({ accounts, chains, apis }, operation) => ({
    accounts,
    chains,
    apis,
    transaction: operation,
  }),
  target: prepareDataFx,
});

sample({
  clock: prepareDataFx.doneData,
  fn: (data) => [data],
  target: transferConfirmModel.events.formInitiated,
});

export const confirm = {
  flow,
};
