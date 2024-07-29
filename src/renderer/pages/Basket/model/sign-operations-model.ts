import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { proxyService } from '@shared/api/proxy';
import {
  type Account,
  type AccountId,
  type Address,
  type Asset,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  type ProxiedAccount,
  type ProxyType,
  type Transaction,
  TransactionType,
  type Validator,
  type Wallet,
} from '@shared/core';
import { type ChainError } from '@shared/core/types/basket';
import { getAssetById, redeemableAmount, toAccountId } from '@shared/lib/utils';
import { basketModel } from '@entities/basket';
import { networkModel, networkUtils } from '@entities/network';
import { eraService, useStakingData, validatorsService } from '@entities/staking';
import { TransferTypes, XcmTypes, transactionService } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { ExtrinsicResult } from '@features/operations/OperationSubmit/lib/types';
import {
  addProxyConfirmModel,
  addPureProxiedConfirmModel,
  bondExtraConfirmModel,
  bondNominateConfirmModel,
  nominateConfirmModel,
  payeeConfirmModel,
  removeProxyConfirmModel,
  removePureProxiedConfirmModel,
  restakeConfirmModel,
  transferConfirmModel,
  unstakeConfirmModel,
  withdrawConfirmModel,
} from '@features/operations/OperationsConfirm';
import { getCoreTx } from '../lib/utils';
import { Step } from '../types';

type FeeMap = Record<ChainId, Record<TransactionType, string>>;

const flowStarted = createEvent<{ transactions: BasketTransaction[]; feeMap: FeeMap }>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const txsConfirmed = createEvent();

const $signerOptions = createStore<FeeMap>({});

type PrepareDataParams = {
  wallets: Wallet[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transactions: BasketTransaction[];
  connections: Record<ChainId, Connection>;
  feeMap: FeeMap;
};

const startDataPreparationFx = createEffect(
  async ({ transactions, wallets, chains, apis, connections, feeMap }: PrepareDataParams) => {
    const dataParams = [];

    for (const transaction of transactions) {
      const coreTx = getCoreTx(transaction, [TransactionType.UNSTAKE, TransactionType.BOND]);

      if (TransferTypes.includes(coreTx.type) || XcmTypes.includes(coreTx.type)) {
        const params = await prepareTransferTransactionData({
          transaction,
          wallets,
          chains,
          apis,
          connections,
          feeMap,
        });

        dataParams.push({ type: TransactionType.TRANSFER, params });
      }

      const TransactionValidators = {
        [TransactionType.ADD_PROXY]: prepareAddProxyTransaction,
        [TransactionType.CREATE_PURE_PROXY]: prepareAddPureProxiedTransaction,
        [TransactionType.REMOVE_PROXY]: prepareRemoveProxyTransaction,
        [TransactionType.REMOVE_PURE_PROXY]: prepareRemovePureProxiedTransaction,

        [TransactionType.BOND]: prepareBondNominateTransaction,
        [TransactionType.NOMINATE]: prepareNominateTransaction,
        [TransactionType.STAKE_MORE]: prepareBondExtraTransaction,
        [TransactionType.DESTINATION]: preparePayeeTransaction,
        [TransactionType.RESTAKE]: prepareRestakeTransaction,
        [TransactionType.UNSTAKE]: prepareUnstakeTransaction,
        [TransactionType.REDEEM]: prepareWithdrawTransaction,
      };

      if (coreTx.type in TransactionValidators) {
        // @ts-expect-error TS thinks that transfer should be in TransactionValidators
        const params = await TransactionValidators[coreTx.type]({
          transaction,
          wallets,
          chains,
          apis,
          connections,
          feeMap,
        });

        dataParams.push({ type: coreTx.type, params });
      }
    }

    return dataParams;
  },
);

const $step = restore(stepChanged, Step.NONE);
const $transactions = createStore<BasketTransaction[]>([]).reset(flowFinished);

const $txDataParams = combine({
  wallets: walletModel.$wallets,
  chains: networkModel.$chains,
  apis: networkModel.$apis,
  connections: networkModel.$connections,
  signerOptions: $signerOptions,
});

type DataParams = Omit<PrepareDataParams, 'transactions'> & { transaction: BasketTransaction };

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

const prepareTransferTransactionData = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;

  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const xcmChain = chains[transaction.coreTx.args.destinationChain] || chain;

  return {
    id: transaction.id,
    xcmChain,
    chain,
    asset: getAssetById(transaction.coreTx.args.asset, chain.assets),
    account,
    amount: transaction.coreTx.args.value,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as TransferInput;
};

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

const prepareAddProxyTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const proxy = await proxyService.getProxiesForAccount(apis[chainId], transaction.coreTx.address);
  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], proxy.deposit, proxy.accounts.length + 1);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    proxyDeposit,
    proxyNumber: proxy.accounts.length + 1,
    fee,
  } as AddProxyInput;
};

type AddPureProxiedInput = {
  chain: Chain;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
  fee: string;
  multisigDeposit: string;
};

const prepareAddPureProxiedTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));
  const proxyDeposit = proxyService.getProxyDeposit(apis[chainId], '0', 1);

  return {
    id: transaction.id,
    chain,
    account,
    amount: transaction.coreTx.args.value,
    description: '',
    fee,
    proxyDeposit,
    multisigDeposit: '0',
  } as AddPureProxiedInput;
};

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

const prepareRemoveProxyTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemoveProxyInput;
};

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

const prepareRemovePureProxiedTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    spawner: toAccountId(transaction.coreTx.args.spawner),
    description: '',

    transaction: transaction.coreTx,
    fee,
  } as RemovePureProxiedInput;
};

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

const prepareBondNominateTransaction = async ({
  transaction,
  wallets,
  chains,
  apis,
  connections,
  feeMap,
}: DataParams) => {
  const bondTx = transaction.coreTx.args.transactions.find((t: Transaction) => t.type === TransactionType.BOND)!;
  const nominateTx = transaction.coreTx.args.transactions.find(
    (t: Transaction) => t.type === TransactionType.NOMINATE,
  )!;

  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chain!.chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = nominateTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: chain.assets[0],
    shards: [account],
    amount: bondTx.args.value,
    validators,
    destination: bondTx.args.dest,
    description: '',

    fee,
    multisigDeposit: '0',
  } as BondNominateInput;
};

type BondExtraInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

const prepareBondExtraTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: transaction.coreTx.args.maxAdditional,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as BondExtraInput;
};

type NominateInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;
};

const prepareNominateTransaction = async ({ transaction, wallets, chains, connections, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  const era = await eraService.getActiveEra(apis[chainId]);
  const isLightClient = networkUtils.isLightClientConnection(connections[chain!.chainId]);
  const validatorsMap = await validatorsService.getValidatorsWithInfo(apis[chainId], era || 0, isLightClient);

  const validators = transaction.coreTx.args.targets.map((address: string) => validatorsMap[address]);

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    validators,
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as NominateInput;
};

type PayeeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  destination?: string;
  description: string;
};

const preparePayeeTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    destination: transaction.coreTx.args.dest,
    description: '',

    fee,
  } as PayeeInput;
};

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

const prepareUnstakeTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const coreTx = getCoreTx(transaction, [TransactionType.UNSTAKE]);

  const chainId = coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: coreTx.args.value,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as UnstakeInput;
};

type RestakeInput = {
  chain: Chain;
  asset: Asset;

  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

const prepareRestakeTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount: transaction.coreTx.args.value,
    description: '',

    fee,
    xcmFee: transaction.coreTx.args.xcmFee || '0',
    multisigDeposit: '0',
  } as RestakeInput;
};

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

const prepareWithdrawTransaction = async ({ transaction, wallets, chains, apis, feeMap }: DataParams) => {
  const chainId = transaction.coreTx.chainId as ChainId;
  const fee =
    feeMap[chainId][transaction.coreTx.type] ||
    (await transactionService.getTransactionFee(transaction.coreTx, apis[chainId]));

  const chain = chains[chainId]!;
  const wallet = wallets.find((c) => c.id === transaction.initiatorWallet)!;
  const account = wallet.accounts.find((a) => a.accountId === toAccountId(transaction.coreTx.address));
  const era = await eraService.getActiveEra(apis[chainId]);

  const staking = (await new Promise((resolve) => {
    useStakingData().subscribeStaking(chainId, apis[chainId], [transaction.coreTx.address], resolve);
  })) as any;

  const amount = redeemableAmount(staking?.[transaction.coreTx.address]?.unlocking, era || 0);

  return {
    id: transaction.id,
    chain,
    asset: getAssetById(transaction.coreTx.args.assetId, chain.assets),
    shards: [account],
    amount,
    description: '',

    fee,
    totalFee: '0',
    multisigDeposit: '0',
  } as WithdrawInput;
};

sample({
  clock: flowStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis, connections }, { transactions, feeMap }) => ({
    transactions,
    wallets,
    chains,
    apis,
    connections,
    feeMap,
  }),
  target: startDataPreparationFx,
});

sample({
  clock: flowStarted,
  target: spread({
    transactions: $transactions,
    signerOptions: $signerOptions,
  }),
});

sample({
  clock: flowStarted,
  source: $transactions,
  filter: (txs) => txs.length > 0,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Transfer

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return (
      dataParams?.filter((tx) => {
        return tx.type === TransactionType.TRANSFER;
      }).length > 0
    );
  },
  fn: (dataParams) => {
    return (
      dataParams
        ?.filter((tx) => {
          return tx.type === TransactionType.TRANSFER;
        })
        .map((tx) => tx.params) || []
    );
  },
  target: transferConfirmModel.events.formInitiated,
});

// Add proxy

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.ADD_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.ADD_PROXY).map((tx) => tx.params) || [];
  },
  target: addProxyConfirmModel.events.formInitiated,
});

// Add pure proxied

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.CREATE_PURE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.CREATE_PURE_PROXY).map((tx) => tx.params) || [];
  },
  target: addPureProxiedConfirmModel.events.formInitiated,
});

// Remove proxy

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PROXY).map((tx) => tx.params) || [];
  },
  target: removeProxyConfirmModel.events.formInitiated,
});

// Remove pure proxied

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PURE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PURE_PROXY).map((tx) => tx.params) || [];
  },
  target: removePureProxiedConfirmModel.events.formInitiated,
});

// Bond nominate

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.BOND).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.BOND).map((tx) => tx.params) || [];
  },
  target: bondNominateConfirmModel.events.formInitiated,
});

// Nominate

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.NOMINATE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.NOMINATE).map((tx) => tx.params) || [];
  },
  target: nominateConfirmModel.events.formInitiated,
});

// Payee

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DESTINATION).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DESTINATION).map((tx) => tx.params) || [];
  },
  target: payeeConfirmModel.events.formInitiated,
});

// Bond extra

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.STAKE_MORE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.STAKE_MORE).map((tx) => tx.params) || [];
  },
  target: bondExtraConfirmModel.events.formInitiated,
});

// Unstake

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNSTAKE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNSTAKE).map((tx) => tx.params) || [];
  },
  target: unstakeConfirmModel.events.formInitiated,
});

// Restake

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.RESTAKE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.RESTAKE).map((tx) => tx.params) || [];
  },
  target: restakeConfirmModel.events.formInitiated,
});

// Withdraw

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REDEEM).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REDEEM).map((tx) => tx.params) || [];
  },
  target: withdrawConfirmModel.events.formInitiated,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: $step,
});

sample({
  clock: [
    transferConfirmModel.output.formConfirmed,
    addProxyConfirmModel.output.formSubmitted,
    addPureProxiedConfirmModel.output.formSubmitted,
    removeProxyConfirmModel.output.formSubmitted,
    removePureProxiedConfirmModel.output.formSubmitted,
    bondExtraConfirmModel.output.formSubmitted,
    bondNominateConfirmModel.output.formSubmitted,
    nominateConfirmModel.output.formSubmitted,
    payeeConfirmModel.output.formSubmitted,
    restakeConfirmModel.output.formSubmitted,
    unstakeConfirmModel.output.formSubmitted,
    withdrawConfirmModel.output.formSubmitted,
    txsConfirmed,
  ],
  source: {
    transactions: $transactions,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  filter: ({ transactions }) => Boolean(transactions) && transactions.length > 0,
  fn: ({ transactions, wallets, chains }) => {
    return {
      event: {
        signingPayloads: transactions.map((tx: BasketTransaction) => ({
          chain: chains[tx.coreTx.chainId],
          account: walletUtils.getAccountsBy(
            wallets,
            (account: Account, wallet: Wallet) =>
              wallet.id === tx.initiatorWallet && account.accountId === toAccountId(tx.coreTx.address),
          )[0],
          signatory: undefined,
          transaction: tx.coreTx,
        })),
      },
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    transactions: $transactions,
    wallets: walletModel.$wallets,
  },
  filter: ({ transactions }) => {
    return Boolean(transactions) && transactions.length > 0;
  },
  fn: ({ transactions, wallets }, signParams) => {
    return {
      event: {
        ...signParams,
        chainId: transactions[0].coreTx.chainId,
        account: walletUtils.getAccountsBy(
          wallets,
          (account: Account, wallet: Wallet) =>
            wallet.id === transactions[0].initiatorWallet &&
            account.accountId === toAccountId(transactions[0].coreTx.address),
        )[0],
        signatory: undefined,
        description: '',
        coreTxs: transactions.map((tx) => tx.coreTx!),
        wrappedTxs: transactions.map((tx) => tx.coreTx!),
        multisigTxs: [],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.filter((tx, index) =>
      results.some((result) => result.id === index && result.result === ExtrinsicResult.SUCCESS),
    );
  },
  target: basketModel.events.transactionsRemoved,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.reduce<BasketTransaction[]>((acc, tx, index) => {
      const result = results.find((result) => result.id === index);

      if (result?.result === ExtrinsicResult.ERROR) {
        acc.push({
          ...tx,
          error: {
            type: 'chain',
            // params will be a string for failed transaction
            message: result.params as string,
            dateCreated: Date.now(),
          } as ChainError,
        });
      }

      return acc;
    }, []);
  },
  target: basketModel.events.transactionsUpdated,
});

export const signOperationsModel = {
  $step,
  $transactions,

  events: {
    flowStarted,
    txsConfirmed,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
