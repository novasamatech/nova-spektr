import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { combineEvents } from 'patronum';

import { networkService } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { FieldRules, RpcValidationMapping } from '../lib/constants';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import { Connection } from '@shared/core';
import { storageService } from '@shared/api/storage';
import {
  VerifyRpcConnectivityFxParams,
  NodeExistParam,
  RpcConnectivityResult,
  SaveRpcNodeFxParams,
} from '../lib/types';

const flowStarted = createEvent();
const flowFinished = createEvent();

const nodeExistVerified = createEvent<boolean>();

const $addCustomRpcForm = createForm({
  fields: {
    name: {
      init: '',
      rules: FieldRules.name,
    },
    url: {
      init: '',
      rules: FieldRules.url,
    },
  },
  validateOn: ['submit'],
});

const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcConnectivityResult>(RpcConnectivityResult.INIT);

const $isNodeExist = createStore<boolean>(false);
const $isFlowStarted = createStore<boolean>(false);

const verifyRpcConnectivityFx = createEffect(
  async ({ chainId, url }: VerifyRpcConnectivityFxParams): Promise<RpcConnectivityResult> => {
    const validationResult = await networkService.validateRpcNode(chainId, url);

    return RpcValidationMapping[validationResult];
  },
);

const addRpcNodeFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
  return storageService.connections.put(connection);
});

// const saveRpcNodeFx = createEffect(({ network, form }: SaveRpcNodeFxParams) => {
//   manageNetworkModel.events.rpcNodeAdded({
//     chainId: network?.chainId,
//     rpcNode: {
//       name: form.name,
//       url: form.url,
//     },
//   });
// });

sample({
  clock: flowStarted,
  fn: () => true,
  target: $isFlowStarted,
});

sample({
  clock: flowStarted,
  target: [$addCustomRpcForm.reset, $rpcConnectivityResult.reinit, $isNodeExist.reinit],
});

// reset the rpc validations when the url field is changed
// sample({
//   clock: $addCustomRpcForm.fields.url.onChange,
//   target: [$rpcConnectivityResult.reinit, $isNodeExist.reinit],
// });

sample({
  clock: nodeExistVerified,
  target: $isNodeExist,
});

sample({
  clock: $addCustomRpcForm.formValidated,
  source: {
    network: $selectedNetwork,
    url: $addCustomRpcForm.fields.url.$value,
  },
  filter: (params: { network: ExtendedChain | null; url: string }): params is { network: ExtendedChain; url: string } =>
    Boolean(params.network),
  fn: ({ network, url }) => ({ chainId: network.chainId, url }),
  target: verifyRpcConnectivityFx,
});

sample({
  clock: verifyRpcConnectivityFx.doneData,
  target: $rpcConnectivityResult,
});

sample({
  clock: verifyRpcConnectivityFx.fail,
  fn: () => RpcConnectivityResult.INIT,
  target: $rpcConnectivityResult,
});

sample({
  clock: $addCustomRpcForm.formValidated,
  source: {
    network: $selectedNetwork,
    url: $addCustomRpcForm.fields.url.$value,
  },
  filter: (params: { network: ExtendedChain | null; url: string }): params is NodeExistParam => !!params.network,
  fn: ({ network, url }: NodeExistParam): boolean => {
    const defaultNodes = network.nodes;
    const customNodes = network.connection.customNodes || [];

    return defaultNodes.some(({ url: u }) => u === url) || customNodes.some(({ url: u }) => u === url);
  },
  target: nodeExistVerified,
});

// TODO: validate existing node inside form schema
sample({
  clock: [nodeExistVerified, verifyRpcConnectivityFx.doneData],
  source: {
    rpcConnectivityResult: $rpcConnectivityResult,
    isNodeExist: $isNodeExist,
    network: $selectedNetwork,
    form: $addCustomRpcForm.$values,
    isFormValid: $addCustomRpcForm.$isValid,
  },
  filter: (params): params is SaveRpcNodeFxParams => {
    const { isNodeExist, rpcConnectivityResult, isFormValid } = params;

    return isFormValid && !isNodeExist && customRpcUtils.isRpcConnectivityValid(rpcConnectivityResult);
  },
  fn: (connections, { chainId, rpcNode }) => {
    const { customNodes, ...rest } = connections[chainId];

    return {
      ...rest,
      customNodes: customNodes.concat(rpcNode),
      activeNode: rpcNode,
    };
  },
  target: addRpcNodeFx,
});

sample({
  clock: flowFinished,
  fn: () => false,
  target: $isFlowStarted,
});

export const addCustomRpcModel = {
  $addCustomRpcForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isNodeExist,
  $isFlowStarted,
  $isLoading: verifyRpcConnectivityFx.pending,

  events: {
    flowStarted,
    flowFinished,
  },
};
