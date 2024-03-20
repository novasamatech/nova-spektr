import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { networkService } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { CustomRpcForm, NodeExistParam, RpcCheckResult } from '../lib/types';
import { manageNetworkModel } from '@pages/Settings/Networks/model/manage-network-model';
import { fieldRules, RpcValidationMapping } from '../lib/constants';

const $addCustomRpcForm = createForm({
  fields: {
    name: {
      init: '',
      rules: fieldRules.name,
    },
    url: {
      init: '',
      rules: fieldRules.url,
    },
  },
  validateOn: ['change'],
});

const formInitiated = createEvent();
const networkChanged = createEvent<ExtendedChain>();
const rpcConnectivityChecked = createEvent<RpcCheckResult>();
const nodeExistChecked = createEvent<boolean>();
const processStarted = createEvent<boolean>();
const rpcConnectivityCheckStarted = createEvent<boolean>();

const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcCheckResult>(RpcCheckResult.INIT);
const $isNodeExist = createStore<boolean>(false);
const $isProcessStarted = createStore<boolean>(false);
const $isLoading = createStore<boolean>(false);

const checkRpcNodeFx = createEffect(
  async ({ network, url }: { network: ExtendedChain | null; url: string }): Promise<RpcCheckResult> => {
    if (!network) return RpcCheckResult.INIT;

    rpcConnectivityCheckStarted(true);
    const validationResult = await networkService.validateRpcNode(network.chainId, url);
    rpcConnectivityCheckStarted(false);
    const result = RpcValidationMapping[validationResult];

    return result;
  },
);

const saveRpcNodeFx = createEffect(
  async ({
    network,
    form,
  }: {
    network: ExtendedChain | null;
    form: CustomRpcForm;
    rpcConnectivityResult: RpcCheckResult;
    isNodeExist: boolean;
  }) => {
    if (!network) return;

    manageNetworkModel.events.rpcNodeAdded({
      chainId: network?.chainId,
      rpcNode: {
        name: form.name,
        url: form.url,
      },
    });

    processStarted(false);
  },
);

const isNodeExistFx = createEffect(({ network, url }: NodeExistParam): boolean => {
  if (!network) {
    return false;
  }

  const defaultNodes = network.nodes;
  const customNodes = network.connection.customNodes || [];

  const result = defaultNodes.some(({ url: u }) => u === url) || customNodes.some(({ url: u }) => u === url);

  return result;
});

const resetFormFx = createEffect(() => {
  resetRpcValidationFx();
  $addCustomRpcForm.reset;
});

const resetRpcValidationFx = createEffect(() => {
  nodeExistChecked(false);
  rpcConnectivityChecked(RpcCheckResult.INIT);
});

sample({
  clock: processStarted,
  target: $isProcessStarted,
});

sample({
  clock: formInitiated,
  target: resetFormFx,
});

sample({
  clock: rpcConnectivityCheckStarted,
  target: $isLoading,
});

// reset the rpc validations when the url field is changed
sample({
  clock: $addCustomRpcForm.fields.url.onChange,
  target: resetRpcValidationFx,
});

sample({
  clock: networkChanged,
  target: $selectedNetwork,
});

sample({
  clock: rpcConnectivityChecked,
  target: $rpcConnectivityResult,
});

sample({
  clock: nodeExistChecked,
  target: $isNodeExist,
});

sample({
  clock: checkRpcNodeFx.doneData,
  target: rpcConnectivityChecked,
});

sample({
  clock: checkRpcNodeFx.fail,
  fn: ({ error }: { error: Error }) => {
    console.warn(error);
    rpcConnectivityCheckStarted(false);

    return RpcCheckResult.INIT;
  },
  target: $rpcConnectivityResult,
});

// when the form is submitted, we need to check if the node is responding
sample({
  clock: $addCustomRpcForm.submit,
  source: { network: $selectedNetwork, url: $addCustomRpcForm.fields.url.$value },
  target: [checkRpcNodeFx, isNodeExistFx],
});

sample({
  clock: isNodeExistFx.doneData,
  target: nodeExistChecked,
});

// if we are done checking the form data and it is valid
// we can proceed with saving the new rpc node
sample({
  clock: [isNodeExistFx.doneData, checkRpcNodeFx.doneData, $addCustomRpcForm.$isValid],
  source: {
    rpcConnectivityResult: $rpcConnectivityResult,
    isNodeExist: $isNodeExist,
    network: $selectedNetwork,
    form: $addCustomRpcForm.$values,
    isValid: $addCustomRpcForm.$isValid,
  },
  filter: ({ isNodeExist, rpcConnectivityResult, isValid }) => {
    return isValid && !isNodeExist && rpcConnectivityResult === RpcCheckResult.VALID;
  },
  target: saveRpcNodeFx,
});

export const addCustomRpcModel = {
  $addCustomRpcForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isNodeExist,
  $isProcessStarted,
  $isLoading,

  events: {
    formInitiated,
    networkChanged,
    processStarted,
  },
};