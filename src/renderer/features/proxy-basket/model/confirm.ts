import { type ApiPromise } from '@polkadot/api';
import { createEffect, sample } from 'effector';
import { createGate } from 'effector-react';

import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ChainId, type Connection, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { type BasketTransaction, basketOperationsService } from '@/aggregates/basket-operations';
import {
  type AddProxyConfirm,
  type AddPureProxiedConfirm,
  type RemoveProxyConfirm,
  addProxyConfirmModel,
  addPureProxiedConfirmModel,
  removeProxyConfirmModel,
} from '@/features/operations/OperationsConfirm';

type DataParams = {
  accounts: AnyAccount[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transaction: BasketTransaction;
  connections: Record<ChainId, Connection>;
};

const flow = createGate<BasketTransaction>();

const prepareAddProxyDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const api = apis[chain.chainId]!;
  const proxy = await proxyService.getProxiesForAccount(api, transaction.coreTx.accountId);
  const proxyDeposit = proxyService
    .getProxyDepositDelta(api, proxy.deposit, proxy.accounts.length + 1)
    .toString();

  return {
    id: transaction.id,
    chain,
    initiator: account!,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,

    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
    route: transaction.route,
    proxyDeposit,
    proxyNumber: proxy.accounts.length + 1,
    fee: fee.toString(),
    signatory: account!,
    multisigDeposit: '0',
  } satisfies AddProxyConfirm;
});

const prepareAddPureProxiedDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(
    transaction,
    apis,
    chains,
    accounts,
  );

  assert(chain, 'Chain not found');

  const proxyDeposit = proxyService.getProxyDepositDelta(apis[chain.chainId]!, '0', 1).toString();

  return {
    id: transaction.id,
    chain,
    initiator: account!,
    fee: fee.toString(),
    proxyDeposit,
    multisigDeposit: '0',
    signatory: account!,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: transaction.route,
  } satisfies AddPureProxiedConfirm;
});

const prepareRemoveProxyDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  assert(chain, 'Chain not found');

  return {
    id: transaction.id,
    chain,
    initiator: account!,
    proxyType: transaction.coreTx.args.proxyType,
    delegate: transaction.coreTx.args.delegate,
    route: transaction.route,

    tx: transaction.coreTx,
    coreTx: transaction.coreTx,
    fee: fee.toString(),
    signatory: account!,
    multisigDeposit: '0',
  } satisfies RemoveProxyConfirm;
});

const prepareRemovePureProxiedDataFx = createEffect(async ({ transaction, accounts, chains, apis }: DataParams) => {
  const { chain, account, fee } = await basketOperationsService.getTransactionData(transaction, apis, chains, accounts);

  assert(chain, 'Chain not found');

  return {
    id: transaction.id,
    chain,
    initiator: account!,
    proxyType: transaction.coreTx.args.proxyType,
    spawner: toAccountId(transaction.coreTx.args.spawner),
    fee: fee.toString(),
    signatory: account!,
    coreTx: transaction.coreTx,
    tx: transaction.coreTx,
    route: transaction.route,
    multisigDeposit: '0',
  } satisfies RemoveProxyConfirm;
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
  target: addProxyConfirmModel.init,
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
  target: removeProxyConfirmModel.init,
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
  target: addPureProxiedConfirmModel.init,
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

    return transaction.type === TransactionType.KILL_PURE_PROXY;
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
  target: removeProxyConfirmModel.init,
});

export const confirm = {
  flow,
};
