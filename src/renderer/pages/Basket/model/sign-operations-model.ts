import { combine, createEffect, createEvent, restore, sample, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Step } from '../types';
import {
  Account,
  AccountId,
  Address,
  Asset,
  BasketTransaction,
  Chain,
  ChainId,
  ProxiedAccount,
  ProxyType,
  Transaction,
  TransactionType,
  Validator,
  Wallet,
} from '@shared/core';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { getAssetById, toAccountId } from '@shared/lib/utils';
import { TransferTypes, XcmTypes, transactionService } from '@entities/transaction';
import {
  addProxyConfirmModel,
  addPureProxiedConfirmModel,
  bondExtraConfirmModel,
  bondNominateConfirmModel,
  nominateConfirmModel,
  payeeConfirmModel,
  removeProxyConfirmModel,
  removePureProxiedConfirmModel,
  transferConfirmModel,
  unstakeConfirmModel,
  withdrawConfirmModel,
} from '@features/operations/OperationsConfirm';

type TransferInput = {
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

const transferDataPreparationStarted = createEvent<BasketTransaction>();
const addProxyDataPreparationStarted = createEvent<BasketTransaction>();
const addPureProxiedDataPreparationStarted = createEvent<BasketTransaction>();
const removeProxyDataPreparationStarted = createEvent<BasketTransaction>();
const removePureProxiedDataPreparationStarted = createEvent<BasketTransaction>();
const bondNominateDataPreparationStarted = createEvent<BasketTransaction>();
const nominateDataPreparationStarted = createEvent<BasketTransaction>();
const bondExtraDataPreparationStarted = createEvent<BasketTransaction>();
const payeeDataPreparationStarted = createEvent<BasketTransaction>();
const unstakeDataPreparationStarted = createEvent<BasketTransaction>();
const restakeDataPreparationStarted = createEvent<BasketTransaction>();
const withdrawDataPreparationStarted = createEvent<BasketTransaction>();

// TODO: Use split or refactor at all
const startDataPreparationFx = createEffect((transactions: BasketTransaction[]) => {
  const boundTransferDataPreparationStarted = scopeBind(transferDataPreparationStarted, { safe: true });
  const boundAddProxyDataPreparationStarted = scopeBind(addProxyDataPreparationStarted, { safe: true });
  const boundAddPureProxiedDataPreparationStarted = scopeBind(addPureProxiedDataPreparationStarted, { safe: true });
  const boundRemoveProxyDataPreparationStarted = scopeBind(removeProxyDataPreparationStarted, { safe: true });
  const boundRemovePureProxiedDataPreparationStarted = scopeBind(removePureProxiedDataPreparationStarted, {
    safe: true,
  });
  const boundBondNominateDataPreparationStarted = scopeBind(bondNominateDataPreparationStarted, { safe: true });
  const boundNominateDataPreparationStarted = scopeBind(nominateDataPreparationStarted, { safe: true });
  const boundBondExtraDataPreparationStarted = scopeBind(bondExtraDataPreparationStarted, { safe: true });
  const boundPayeeDataPreparationStarted = scopeBind(payeeDataPreparationStarted, { safe: true });
  const boundUnstakeDataPreparationStarted = scopeBind(unstakeDataPreparationStarted, { safe: true });
  const boundRestakeDataPreparationStarted = scopeBind(restakeDataPreparationStarted, { safe: true });
  const boundWithrawDataPreparationStarted = scopeBind(withdrawDataPreparationStarted, { safe: true });

  for (const tx of transactions) {
    if (TransferTypes.includes(tx.coreTx.type) || XcmTypes.includes(tx.coreTx.type)) {
      boundTransferDataPreparationStarted(tx);
    }

    const TransactionValidators = {
      [TransactionType.ADD_PROXY]: boundAddProxyDataPreparationStarted,
      [TransactionType.CREATE_PURE_PROXY]: boundAddPureProxiedDataPreparationStarted,
      [TransactionType.REMOVE_PROXY]: boundRemoveProxyDataPreparationStarted,
      [TransactionType.REMOVE_PURE_PROXY]: boundRemovePureProxiedDataPreparationStarted,

      [TransactionType.BOND]: boundBondNominateDataPreparationStarted,
      [TransactionType.NOMINATE]: boundNominateDataPreparationStarted,
      [TransactionType.STAKE_MORE]: boundBondExtraDataPreparationStarted,
      [TransactionType.DESTINATION]: boundPayeeDataPreparationStarted,
      [TransactionType.RESTAKE]: boundRestakeDataPreparationStarted,
      [TransactionType.UNSTAKE]: boundUnstakeDataPreparationStarted,
      [TransactionType.REDEEM]: boundWithrawDataPreparationStarted,
    };

    if (tx.coreTx.type in TransactionValidators) {
      // TS thinks that transfer should be in TransactionValidators
      // @ts-ignore`
      TransactionValidators[tx.coreTx.type](tx);
    }
  }
});

const $step = restore(stepChanged, Step.NONE);
const $transactions = restore(flowStarted, []);

const $txDataParams = combine({
  wallets: walletModel.$wallets,
  chains: networkModel.$chains,
  apis: networkModel.$apis,
});

type TransferDataParams = {
  wallets: Wallet[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
};

const prepareTransferTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
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
    } as TransferInput;
  },
);

type AddProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;

  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;

  proxyDeposit: string;
  proxyNumber: number;
};

const prepareAddProxyTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      account,
      proxyType: transaction.coreTx.args.proxyType,
      delegate: transaction.coreTx.args.delegate,
      description: '',

      transaction: transaction.coreTx,
      proxyDeposit: '0',
      proxyNumber: 1,
      fee,
    } as AddProxyInput;
  },
);

type AddPureProxiedInput = {
  chain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
  fee: string;
  multisigDeposit: string;
};

const prepareAddPureProxiedTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      account,
      amount: transaction.coreTx.args.value,
      description: '',
      fee,
      multisigDeposit: '0',
    } as AddPureProxiedInput;
  },
);

type RemoveProxyInput = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;
  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;
};

const prepareRemoveProxyTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      account,
      proxyType: transaction.coreTx.args.proxyType,
      delegate: transaction.coreTx.args.delegate,
      description: '',

      transaction: transaction.coreTx,
      fee,
    } as RemoveProxyInput;
  },
);

type RemovePureProxiedInput = {
  signatory?: Account;
  description: string;
  transaction: Transaction;
  spawner: AccountId;
  proxyType: ProxyType;
  chain?: Chain;
  account?: Account;
  proxiedAccount?: ProxiedAccount;
};

const prepareRemovePureProxiedTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      account,
      proxyType: transaction.coreTx.args.proxyType,
      spawner: toAccountId(transaction.coreTx.args.spawner),
      description: '',

      transaction: transaction.coreTx,
      fee,
    } as RemovePureProxiedInput;
  },
);

type BondNominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: string;
  description: string;
};

const prepareBondNominateTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      amount: transaction.coreTx.args.value,
      validators: transaction.coreTx.args.targets,
      destination: transaction.coreTx.args.dest,
      description: '',

      fee,
      xcmFee: transaction.coreTx.args.xcmFee || '0',
      multisigDeposit: '0',
    } as BondNominateInput;
  },
);

type BondExtraInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

const prepareBondExtraTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      amount: transaction.coreTx.args.value,
      description: '',

      fee,
      xcmFee: transaction.coreTx.args.xcmFee || '0',
      multisigDeposit: '0',
    } as BondExtraInput;
  },
);

type NominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
};

const prepareNominateTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      validators: transaction.coreTx.args.targets,
      destination: transaction.coreTx.args.dest,
      description: '',

      fee,
    } as NominateInput;
  },
);

type PayeeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  destination?: string;
  description: string;
};

const preparePayeeTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      destination: transaction.coreTx.args.dest,
      description: '',

      fee,
    } as PayeeInput;
  },
);

type UnstakeInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const prepareUnstakeTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      amount: transaction.coreTx.args.value,
      description: '',

      fee,
      totalFee: '0',
      multisigDeposit: '0',
    } as UnstakeInput;
  },
);

type RestakeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

const prepareRestakeTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      amount: transaction.coreTx.args.value,
      description: '',

      fee,
      xcmFee: transaction.coreTx.args.xcmFee || '0',
      multisigDeposit: '0',
    } as RestakeInput;
  },
);

type WithdrawInput = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const prepareWithdrawTransactionDataFx = createEffect(
  async ({ transaction, wallets, chains, apis }: TransferDataParams) => {
    const chainId = transaction.coreTx.chainId as ChainId;
    const fee = await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]);

    const chain = chains[chainId]!;
    const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
    const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

    return {
      chain,
      asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
      shards: [account],
      amount: transaction.coreTx.args.value,
      description: '',

      fee,
      totalFee: '0',
      multisigDeposit: '0',
    } as WithdrawInput;
  },
);

sample({
  clock: flowStarted,
  target: startDataPreparationFx,
});

// Transfer

sample({
  clock: transferDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareTransferTransactionDataFx,
});

sample({
  clock: prepareTransferTransactionDataFx.doneData,
  target: transferConfirmModel.events.formInitiated,
});

// Add proxy

sample({
  clock: addProxyDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareAddProxyTransactionDataFx,
});

sample({
  clock: prepareAddProxyTransactionDataFx.doneData,
  target: addProxyConfirmModel.events.formInitiated,
});

// Add pure proxied

sample({
  clock: addPureProxiedDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareAddPureProxiedTransactionDataFx,
});

sample({
  clock: prepareAddPureProxiedTransactionDataFx.doneData,
  target: addPureProxiedConfirmModel.events.formInitiated,
});

// Remove proxy

sample({
  clock: removeProxyDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareRemoveProxyTransactionDataFx,
});

sample({
  clock: prepareRemoveProxyTransactionDataFx.doneData,
  target: removeProxyConfirmModel.events.formInitiated,
});

// Remove pure proxied

sample({
  clock: removePureProxiedDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareRemovePureProxiedTransactionDataFx,
});

sample({
  clock: prepareRemovePureProxiedTransactionDataFx.doneData,
  target: removePureProxiedConfirmModel.events.formInitiated,
});

// Bond nominate

sample({
  clock: bondNominateDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareBondNominateTransactionDataFx,
});

sample({
  clock: prepareBondNominateTransactionDataFx.doneData,
  target: bondNominateConfirmModel.events.formInitiated,
});

// Nominate

sample({
  clock: nominateDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareNominateTransactionDataFx,
});

sample({
  clock: prepareNominateTransactionDataFx.doneData,
  target: nominateConfirmModel.events.formInitiated,
});

// Payee

sample({
  clock: payeeDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: preparePayeeTransactionDataFx,
});

sample({
  clock: preparePayeeTransactionDataFx.doneData,
  target: payeeConfirmModel.events.formInitiated,
});

// Bond extra

sample({
  clock: bondExtraDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareBondExtraTransactionDataFx,
});

sample({
  clock: prepareBondExtraTransactionDataFx.doneData,
  target: bondExtraConfirmModel.events.formInitiated,
});

// Unstake

sample({
  clock: unstakeDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareUnstakeTransactionDataFx,
});

sample({
  clock: prepareUnstakeTransactionDataFx.doneData,
  target: unstakeConfirmModel.events.formInitiated,
});

// Restake

sample({
  clock: restakeDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareRestakeTransactionDataFx,
});

sample({
  clock: prepareUnstakeTransactionDataFx.doneData,
  target: unstakeConfirmModel.events.formInitiated,
});

// Withdraw

sample({
  clock: withdrawDataPreparationStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis }, transaction) => ({ transaction, wallets, chains, apis }),
  target: prepareWithdrawTransactionDataFx,
});

sample({
  clock: prepareWithdrawTransactionDataFx.doneData,
  target: withdrawConfirmModel.events.formInitiated,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: $step,
});

sample({
  clock: [
    prepareAddProxyTransactionDataFx.doneData,
    prepareAddPureProxiedTransactionDataFx.doneData,
    prepareBondExtraTransactionDataFx.doneData,
    prepareBondNominateTransactionDataFx.doneData,
    prepareNominateTransactionDataFx.doneData,
    preparePayeeTransactionDataFx.doneData,
    prepareRemoveProxyTransactionDataFx.doneData,
    prepareRemovePureProxiedTransactionDataFx.doneData,
    prepareRestakeTransactionDataFx.doneData,
    prepareTransferTransactionDataFx.doneData,
    prepareUnstakeTransactionDataFx.doneData,
    prepareWithdrawTransactionDataFx.doneData,
  ],
  fn: () => Step.CONFIRM,
  target: stepChanged,
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
