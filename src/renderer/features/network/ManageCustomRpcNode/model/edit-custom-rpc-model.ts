import { createEffect, createEvent, createStore, sample, scopeBind, combine } from 'effector';
import { createForm } from 'effector-forms';
import { spread, delay } from 'patronum';
import { WsProvider } from '@polkadot/rpc-provider';
import { ApiPromise } from '@polkadot/api';

import { RpcValidation } from '@shared/api/network';
import { Connection, RpcNode, HexString } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { networkModel } from '@entities/network';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import { FieldRules, CONNECTION_TIMEOUT } from '../lib/constants';

type Input = {
  chainName: string;
  nodeToEdit: RpcNode;
  connection: Connection;
  existingNodes: RpcNode[];
};

const flowStarted = createEvent<Input>();
const flowFinished = createEvent<RpcNode>();

const providerConnected = createEvent();
const providerFailed = createEvent();

const $chainName = createStore<string | null>(null).reset(flowFinished);
const $nodeToEdit = createStore<RpcNode | null>(null).reset(flowFinished);
$nodeToEdit.watch((x) => {
  console.log('=== rpc', x);
});
const $connection = createStore<Connection | null>(null).reset(flowFinished);
const $existingNodes = createStore<RpcNode[]>([]).reset(flowFinished);

const $provider = createStore<WsProvider | null>(null);
const $rpcValidation = createStore<RpcValidation | null>(null).reset(flowFinished);
const $isLoading = createStore<boolean>(false).reset(flowFinished);

const $editCustomRpcForm = createForm({
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
          source: combine({
            nodeToEdit: $nodeToEdit,
            existingNodes: $existingNodes,
          }),
          validator: (value, _, { nodeToEdit, existingNodes }): boolean => {
            return existingNodes
              .filter((node: RpcNode) => node.url !== nodeToEdit.url)
              .every((node: RpcNode) => node.url !== value);
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

const updateRpcNodeFx = createEffect(async ({ id, ...rest }: Connection): Promise<Connection | undefined> => {
  const connectionId = await storageService.connections.update(id, rest);

  return connectionId ? { id, ...rest } : undefined;
});

const $canSubmit = combine(
  {
    isValid: $editCustomRpcForm.$isValid,
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
    nodeToEdit: $nodeToEdit,
    connection: $connection,
    existingNodes: $existingNodes,
  }),
});

sample({
  clock: flowStarted,
  fn: ({ nodeToEdit }) => nodeToEdit,
  target: $editCustomRpcForm.setInitialForm,
});

sample({
  clock: $editCustomRpcForm.fields.url.onChange,
  target: $rpcValidation.reinit,
});

sample({
  clock: $editCustomRpcForm.formValidated,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: $editCustomRpcForm.formValidated,
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
    nodeToEdit: $nodeToEdit,
    formData: $editCustomRpcForm.$values,
    rpcValidation: $rpcValidation,
  },
  filter: ({ connection, nodeToEdit, rpcValidation }) => {
    const hasConnection = connection !== null;
    const hasNode = nodeToEdit !== null;
    const validRpc = rpcValidation !== null && customRpcUtils.isRpcValid(rpcValidation);

    return hasConnection && hasNode && validRpc;
  },
  fn: ({ connection, nodeToEdit, formData }) => {
    const customNodes = connection!.customNodes.map(node => {
      return customRpcUtils.isSameNode(node, nodeToEdit!) ? formData : node;
    });

    return { ...connection!, customNodes };
  },
  target: updateRpcNodeFx,
});

sample({
  clock: updateRpcNodeFx.doneData,
  source: networkModel.$connections,
  filter: (_, newConnection) => Boolean(newConnection),
  fn: (connections, newConnection) => ({
    ...connections,
    [newConnection!.chainId]: newConnection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: updateRpcNodeFx.doneData,
  source: $editCustomRpcForm.$values,
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
  target: $editCustomRpcForm.reset,
});

export const editCustomRpcModel = {
  $editCustomRpcForm,
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

// {
//   "url": "wss://rpc.ibp.network/westend", wss://westend-rpc.blockops.network/ws
//   "name": "IBP network node"
// },

