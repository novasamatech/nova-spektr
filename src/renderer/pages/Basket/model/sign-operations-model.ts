import { createEffect, createEvent, restore, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Step } from '../types';
import { Account, Address, Asset, BasketTransaction, Chain, ChainId, Wallet } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { getAssetById, toAccountId } from '@/src/renderer/shared/lib/utils';
import { transactionService } from '@/src/renderer/entities/transaction';
import { transferConfirmModel } from '@/src/renderer/features/operations/OperationsConfirm';

type Input = {
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

const flowStarted = createEvent<BasketTransaction[]>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();

const $step = restore(stepChanged, Step.NONE);
const $transactions = restore(flowStarted, []);

const prepareTransactionDataFx = createEffect(
  async ({
    transactions,
    wallets,
    chains,
    apis,
  }: {
    wallets: Wallet[];
    chains: Record<ChainId, Chain>;
    apis: Record<ChainId, ApiPromise>;
    transactions: BasketTransaction[];
  }) => {
    const transaction = transactions[0];
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    const xcmChain = chains[transaction.coreTx.args.destinationChain] || chain;

    return {
      xcmChain,
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      account,
      amount: transaction.coreTx.args.value,
      destination: transaction.coreTx.args.dest,
      description: '',

      fee,
      xcmFee: transaction.coreTx.args.xcmFee || '0',
      multisigDeposit: '0',
    } as Input;
  },
);

sample({
  clock: flowStarted,
  source: {
    transactions: $transactions,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  target: prepareTransactionDataFx,
});

sample({
  clock: prepareTransactionDataFx.doneData,
  target: transferConfirmModel.events.formInitiated,
});

sample({
  clock: prepareTransactionDataFx.doneData,
  fn: (input) => {
    console.log('xcm', input);

    return Step.CONFIRM;
  },
  target: stepChanged,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: $step,
});

export const signOperationsModel = {
  $step,
  $transactions,

  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
