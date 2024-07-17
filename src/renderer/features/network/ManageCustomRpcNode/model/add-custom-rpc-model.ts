import { ApiPromise } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider';
import { combine, createEffect, createEvent, createStore, merge, sample, scopeBind } from 'effector';
import { createForm } from 'effector-forms';
import { delay, spread } from 'patronum';

import { storageService } from '@shared/api/storage';
import { type ChainId, type Connection, type HexString, type RpcNode } from '@shared/core';

import { networkModel } from '@entities/network';

import { CONNECTION_TIMEOUT, FieldRules } from '../lib/constants';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import { RpcValidation } from '../lib/types';

type Input = {
  chainName: string;
  connection: Connection;
  existingNodes: RpcNode[];
};

const flowStarted = createEvent<Input>();
const flowClosed = createEvent();
const flowFinished = createEvent<{ chainId: ChainId; node: RpcNode }>();
const storesReset = merge([flowClosed, flowFinished]);

const providerConnected = createEvent();
const providerFailed = createEvent();

const $chainName = createStore<string | null>(null).reset(storesReset);
const $connection = createStore<Connection | null>(null).reset(storesReset);
const $existingNodes = createStore<RpcNode[]>([]).reset(storesReset);

const $provider = createStore<WsProvider | null>(null);
const $rpcValidation = createStore<RpcValidation | null>(null).reset(storesReset);
const $isLoading = createStore<boolean>(false).reset(storesReset);

const $addCustomRpcForm = createForm({
  fields: {
    name: {
      init: '',
      rules: FieldRules.name,
    },
    url: {
      init: '',
      rules: [
        ...FieldRules.url,
        {
          name: 'nodeExist',
          errorText: 'settings.networks.nodeExist',
          source: $existingNodes,
          validator: (value, _, existingNodes): boolean => {
            return existingNodes.every((node: RpcNode) => node.url !== value);
          },
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const getWsProviderFx = createEffect((url: string): WsProvider => {
  const boundConnected = scopeBind(providerConnected, { safe: true });
  const boundFailed = scopeBind(providerFailed, { safe: true });

  const provider = new WsProvider(url);

  provider.on('connected', boundConnected);
  provider.on('error', boundFailed);

  return provider;
});

const disconnectProviderFx = createEffect((provider: WsProvider): Promise<void> => {
  provider.on('connected', () => undefined);
  provider.on('disconnected', () => undefined);
  provider.on('error', () => undefined);

  return provider.disconnect();
});

const getGenesisHashFx = createEffect(async (provider: WsProvider): Promise<HexString> => {
  const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

  return api.genesisHash.toHex();
});

const updateConnectionFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
  return storageService.connections.put(connection);
});

const $canSubmit = combine(
  {
    isValid: $addCustomRpcForm.$isValid,
    isLoading: $isLoading,
    rpcValidation: $rpcValidation,
  },
  ({ isValid, isLoading, rpcValidation }) => {
    return isValid && !isLoading && (!rpcValidation || customRpcUtils.isRpcValid(rpcValidation));
  },
);

sample({
  clock: flowStarted,
  target: spread({
    chainName: $chainName,
    connection: $connection,
    existingNodes: $existingNodes,
  }),
});

sample({
  clock: $addCustomRpcForm.fields.url.onChange,
  target: $rpcValidation.reinit,
});

sample({
  clock: $addCustomRpcForm.formValidated,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: $addCustomRpcForm.formValidated,
  fn: ({ url }) => url,
  target: getWsProviderFx,
});

sample({
  clock: getWsProviderFx.doneData,
  target: $provider,
});

sample({
  clock: [delay(getWsProviderFx.doneData, CONNECTION_TIMEOUT), providerFailed],
  source: $provider,
  filter: (provider: WsProvider | null): provider is WsProvider => provider !== null,
  fn: (provider) => ({
    loading: false,
    validation: RpcValidation.INVALID,
    disconnect: provider,
  }),
  target: spread({
    loading: $isLoading,
    validation: $rpcValidation,
    disconnect: disconnectProviderFx,
  }),
});

sample({
  clock: disconnectProviderFx.finally,
  fn: () => null,
  target: $provider,
});

sample({
  clock: providerConnected,
  source: $provider,
  filter: (provider): provider is WsProvider => provider !== null,
  target: getGenesisHashFx,
});

sample({
  clock: getGenesisHashFx.doneData,
  source: {
    connection: $connection,
    provider: $provider,
  },
  filter: ({ connection, provider }) => connection !== null && provider !== null,
  fn: ({ connection, provider }, genesisHash) => ({
    loading: false,
    validation: connection!.chainId === genesisHash ? RpcValidation.VALID : RpcValidation.WRONG_NETWORK,
    disconnect: provider!,
  }),
  target: spread({
    loading: $isLoading,
    validation: $rpcValidation,
    disconnect: disconnectProviderFx,
  }),
});

sample({
  clock: getGenesisHashFx.doneData,
  source: {
    connection: $connection,
    form: $addCustomRpcForm.$values,
    rpcValidation: $rpcValidation,
  },
  filter: ({ connection, rpcValidation }) => {
    return connection !== null && rpcValidation !== null && customRpcUtils.isRpcValid(rpcValidation);
  },
  fn: ({ connection, form }) => {
    return {
      ...connection!,
      customNodes: connection!.customNodes.concat({ name: form.name, url: form.url }),
    };
  },
  target: updateConnectionFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$connections,
  filter: (_, newConnection) => Boolean(newConnection),
  fn: (connections, newConnection) => ({
    ...connections,
    [newConnection!.chainId]: newConnection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: updateConnectionFx.doneData,
  source: $addCustomRpcForm.$values,
  filter: (_, connection) => connection !== null,
  fn: (formData, connection) => ({
    chainId: connection!.chainId,
    node: formData,
  }),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  source: $provider,
  filter: (provider: WsProvider | null): provider is WsProvider => provider !== null,
  fn: (provider) => ({
    loading: false,
    disconnect: provider,
  }),
  target: spread({
    loading: $isLoading,
    disconnect: disconnectProviderFx,
  }),
});

sample({
  clock: storesReset,
  target: $addCustomRpcForm.reset,
});

export const addCustomRpcModel = {
  $addCustomRpcForm,
  $chainId: $connection.map((state) => state?.chainId || null),
  $chainName,
  $rpcValidation,
  $isFlowStarted: $connection.map((state) => Boolean(state)),
  $isLoading,
  $canSubmit,

  events: {
    flowStarted,
    flowClosed,
  },

  output: {
    flowFinished,
  },
};
