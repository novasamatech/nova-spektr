import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { networkService } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { manageNetworkModel } from '@pages/Settings/Networks/model/manage-network-model';
import { customRpcConstants } from '../lib/custom-rpc-constants';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import {
  VerifyRpcConnectivityFxParams,
  NodeExistParam,
  RpcConnectivityResult,
  SaveRpcNodeFxParams,
} from '../lib/custom-rpc-types';

const formInitiated = createEvent();
const flowStarted = createEvent();
const flowFinished = createEvent();

const networkChanged = createEvent<ExtendedChain>();
const rpcConnectivityVerified = createEvent<RpcConnectivityResult>();
const nodeExistVerified = createEvent<boolean>();

const $addCustomRpcForm = createForm({
  fields: {
    name: {
      init: '',
      rules: customRpcConstants.FieldRules.name,
    },
    url: {
      init: '',
      rules: customRpcConstants.FieldRules.url,
    },
  },
  validateOn: ['submit'],
});

const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcConnectivityResult>(RpcConnectivityResult.INIT);

const $isNodeExist = createStore<boolean>(false);
const $isFlowStarted = createStore<boolean>(false);
const $isLoading = createStore<boolean>(false);

const verifyRpcConnectivityFx = createEffect(
  async ({ chainId, url }: VerifyRpcConnectivityFxParams): Promise<RpcConnectivityResult> => {
    const validationResult = await networkService.validateRpcNode(chainId, url);

    return customRpcConstants.RpcValidationMapping[validationResult];
  },
);

const saveRpcNodeFx = createEffect(async ({ network, form }: SaveRpcNodeFxParams) => {
  manageNetworkModel.events.rpcNodeAdded({
    chainId: network?.chainId,
    rpcNode: {
      name: form.name,
      url: form.url,
    },
  });
});

sample({
  clock: flowStarted,
  fn: () => true,
  target: $isFlowStarted,
});

sample({
  clock: flowFinished,
  fn: () => false,
  target: $isFlowStarted,
});

sample({
  clock: formInitiated,
  target: [$rpcConnectivityResult.reinit, $isNodeExist.reinit, $addCustomRpcForm.reset],
});

sample({
  clock: verifyRpcConnectivityFx.pending,
  target: $isLoading,
});

// reset the rpc validations when the url field is changed
sample({
  clock: $addCustomRpcForm.fields.url.onChange,
  target: [$rpcConnectivityResult.reinit, $isNodeExist.reinit],
});

sample({
  clock: networkChanged,
  target: $selectedNetwork,
});

sample({
  clock: rpcConnectivityVerified,
  target: $rpcConnectivityResult,
});

sample({
  clock: nodeExistVerified,
  target: $isNodeExist,
});

sample({
  clock: verifyRpcConnectivityFx.doneData,
  target: rpcConnectivityVerified,
});

sample({
  clock: verifyRpcConnectivityFx.fail,
  fn: ({ error }: { error: Error }) => {
    console.warn(error);

    return RpcConnectivityResult.INIT;
  },
  target: $rpcConnectivityResult,
});

// when the form is submitted, we need to verify if the node is responding
sample({
  clock: $addCustomRpcForm.submit,
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
  clock: $addCustomRpcForm.submit,
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

// if we are done verifying the form data and it is valid
// we can proceed with saving the new rpc node
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
  target: saveRpcNodeFx,
});

sample({
  clock: saveRpcNodeFx.done,
  target: $isFlowStarted.reinit,
});

export const addCustomRpcModel = {
  $addCustomRpcForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isNodeExist,
  $isFlowStarted,
  $isLoading,

  events: {
    formInitiated,
    networkChanged,
    flowStarted,
    flowFinished,
  },
};
