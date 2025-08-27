import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type ChainId } from '@/shared/core';
import { getAssetById, nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import { type TransferConfirmStore, transferConfirmModel } from '@/features/operations/OperationsConfirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
};

const flow = createGate<BasketTransaction>();

const prepareDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  const destinationChain = chains[transaction.coreTx.args.destinationChain] || chain;
  const asset = getAssetById(transaction.coreTx.args.asset, chain.assets);

  if (nullable(account) || nullable(asset)) return null;

  return {
    id: transaction.id,
    destinationChain,
    chain,
    asset,
    initiator: account,
    signatory: account,
    route: [account],
    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
    amount: transaction.coreTx.args.value,
    destination: transaction.coreTx.args.dest,

    fee,
    // TODO: Calculate delivery fee
    deliveryFee: BN_ZERO,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: BN_ZERO,
  } satisfies TransferConfirmStore;
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
  clock: prepareDataFx.doneData.filter({ fn: nonNullable }),
  fn: (data) => [data],
  target: transferConfirmModel.init,
});

export const confirm = {
  flow,
};
