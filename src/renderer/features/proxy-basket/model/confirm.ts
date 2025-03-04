import { type ApiPromise } from '@polkadot/api';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type BasketTransaction, type Chain, type ChainId, type Connection, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  addProxyConfirmModel,
  addPureProxiedConfirmModel,
  removeProxyConfirmModel,
  removePureProxiedConfirmModel,
} from '@/features/operations/OperationsConfirm';
import {
  type AddProxyInput,
  type AddPureProxiedInput,
  type RemoveProxyInput,
  type RemovePureProxiedInput,
} from '../types/confirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
};

const flow = createGate<BasketTransaction>();

const prepareAddProxyDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  const proxy = await proxyService.getProxiesForAccount(apis[chainId], transaction.coreTx.accountId);
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
    signatory: null,
    multisigDeposit: '0',
  } as AddProxyInput;
});

const prepareAddPureProxiedDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chainId, chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

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
    signatory: null,
  } as AddPureProxiedInput;
});

const prepareRemoveProxyDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    description: '',

    transaction: transaction.coreTx,
    fee,
    signatory: null,
    multisigDeposit: '0',
  } as RemoveProxyInput;
});

const prepareRemovePureProxiedDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  return {
    id: transaction.id,
    chain,
    account,
    proxyType: transaction.coreTx.args.proxyType,
    spawner: toAccountId(transaction.coreTx.args.spawner),
    description: '',

    transaction: transaction.coreTx,
    fee,
    signatory: null,
    multisigDeposit: '0',
  } as RemovePureProxiedInput;
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.ADD_PROXY;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareAddProxyDataFx,
});

sample({
  clock: prepareAddProxyDataFx.doneData,
  fn: (data) => [data],
  target: addProxyConfirmModel.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_PROXY;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareRemoveProxyDataFx,
});

sample({
  clock: prepareRemoveProxyDataFx.doneData,
  fn: (data) => [data],
  target: removeProxyConfirmModel.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.CREATE_PURE_PROXY;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareAddPureProxiedDataFx,
});

sample({
  clock: prepareAddPureProxiedDataFx.doneData,
  fn: (data) => [data],
  target: addPureProxiedConfirmModel.events.formInitiated,
});

sample({
  clock: flow.open,
  source: {
    accounts: walletModel.$availableAccounts,
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    connections: networkModel.$connections,
  },
  filter: (_, operation) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_PURE_PROXY;
  },
  fn: ({ accounts, chains, apis, connections }, operation) => ({
    accounts,
    chains,
    apis,
    connections,
    transaction: operation,
  }),
  target: prepareRemovePureProxiedDataFx,
});

sample({
  clock: prepareRemovePureProxiedDataFx.doneData,
  fn: (data) => [data],
  target: removePureProxiedConfirmModel.events.formInitiated,
});

export const confirm = {
  flow,
};
