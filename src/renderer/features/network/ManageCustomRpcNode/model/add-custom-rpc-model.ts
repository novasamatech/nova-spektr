import { createEffect, createEvent, createStore, sample, scopeBind, combine } from 'effector';
import { createForm } from 'effector-forms';
import { spread, delay } from 'patronum';
import { WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';

import { RpcValidation } from '@shared/api/network';
import { Connection, RpcNode, HexString } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { networkModel } from '@entities/network';
import { CustomRpcForm } from '../lib/types';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import { FieldRules, CONNECTION_TIMEOUT } from '../lib/constants';

type Input = {
  chainName: string;
  connection: Connection;
  existingNodes: RpcNode[];
};

const flowStarted = createEvent<Input>();
const flowFinished = createEvent<RpcNode>();

const providerConnected = createEvent();
const providerFailed = createEvent();

const $chainName = createStore<string | null>(null).reset(flowFinished);
const $connection = createStore<Connection | null>(null).reset(flowFinished);
const $existingNodes = createStore<RpcNode[]>([]).reset(flowFinished);

const $provider = createStore<WsProvider | null>(null);
const $rpcValidation = createStore<RpcValidation | null>(null).reset(flowFinished);
const $isLoading = createStore<boolean>(false).reset(flowFinished);

const $addCustomRpcForm = createForm<CustomRpcForm>({
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
  return provider.disconnect();
});

const getGenesisHashFx = createEffect(async (provider: WsProvider): Promise<HexString> => {
  const api = await ApiPromise.create({ provider, throwOnConnect: true, throwOnUnknown: true });

  return api.genesisHash.toHex();
});

const addRpcNodeFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
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
  target: addRpcNodeFx,
});

sample({
  clock: addRpcNodeFx.doneData,
  source: networkModel.$connections,
  filter: (_, newConnection) => Boolean(newConnection),
  fn: (connections, newConnection) => ({
    ...connections,
    [newConnection!.chainId]: newConnection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: addRpcNodeFx.doneData,
  filter: (newConnection: Connection | undefined): newConnection is Connection => {
    return newConnection !== undefined && newConnection.customNodes.length > 0;
  },
  fn: (newConnection) => newConnection.customNodes.at(-1)!,
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
  clock: flowFinished,
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
  },

  output: {
    flowFinished,
  },
};
