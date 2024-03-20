import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { networkService } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { CustomRpcForm, RpcCheckResult } from '../lib/types';
import { manageNetworkModel } from '@pages/Settings/Networks/model/manage-network-model';
import { RpcNode } from '@shared/core';
import { RpcValidationMapping, fieldRules } from '../lib/constants';

const $editCustomRpcForm = createForm({
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
const nodeSelected = createEvent<RpcNode>();
const rpcConnectivityChecked = createEvent<RpcCheckResult>();
const processStarted = createEvent<boolean>();

const $selectedNode = createStore<RpcNode | null>(null);
const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcCheckResult>(RpcCheckResult.INIT);
const $isProcessStarted = createStore<boolean>(false);
const $isLoading = createStore<boolean>(false);

const checkRpcNodeFx = createEffect(
  async ({ network, url }: { network: ExtendedChain | null; url: string }): Promise<RpcCheckResult> => {
    if (!network) return RpcCheckResult.INIT;

    const validationResult = await networkService.validateRpcNode(network.chainId, url);
    const result = RpcValidationMapping[validationResult];

    return result;
  },
);

const editRpcNodeFx = createEffect(
  async ({
    network,
    form,
    nodeToEdit,
  }: {
    network: ExtendedChain | null;
    form: CustomRpcForm;
    rpcConnectivityResult: RpcCheckResult;
    nodeToEdit: RpcNode | null;
  }) => {
    if (!network) return;
    if (!nodeToEdit) return;

    manageNetworkModel.events.rpcNodeUpdated({
      chainId: network.chainId,
      oldNode: nodeToEdit,
      rpcNode: { url: form.url, name: form.name },
    });

    processStarted(false);
  },
);

const updateInitialValuesFx = createEffect(({ url, name }: RpcNode) => {
  $editCustomRpcForm.fields.url.onChange(url);
  $editCustomRpcForm.fields.name.onChange(name);
});

const resetFormFx = createEffect(() => {
  resetRpcValidationFx();
  $editCustomRpcForm.reset;
});

const resetRpcValidationFx = createEffect(() => {
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
  clock: checkRpcNodeFx.pending,
  target: $isLoading,
});

// reset the rpc validations when the url field is changed
sample({
  clock: $editCustomRpcForm.fields.url.onChange,
  target: resetRpcValidationFx,
});

sample({
  clock: networkChanged,
  target: $selectedNetwork,
});

sample({
  clock: nodeSelected,
  target: [$selectedNode, updateInitialValuesFx],
});

sample({
  clock: rpcConnectivityChecked,
  target: $rpcConnectivityResult,
});

// when the form is submitted, we need to check if the node is responding
sample({
  clock: $editCustomRpcForm.submit,
  source: { network: $selectedNetwork, url: $editCustomRpcForm.fields.url.$value },
  filter: ({ network }: { network: ExtendedChain | null }) => !!network,
  target: checkRpcNodeFx,
});

sample({
  clock: checkRpcNodeFx.doneData,
  target: rpcConnectivityChecked,
});

// if we are done checking the form data and it is valid
// we can proceed with editing the rpc node
sample({
  clock: checkRpcNodeFx.doneData,
  source: {
    rpcConnectivityResult: $rpcConnectivityResult,
    network: $selectedNetwork,
    form: $editCustomRpcForm.$values,
    nodeToEdit: $selectedNode,
    isValid: $editCustomRpcForm.$isValid,
  },
  filter: ({ rpcConnectivityResult, network, nodeToEdit, isValid }) => {
    return isValid && rpcConnectivityResult === RpcCheckResult.VALID && network !== null && nodeToEdit !== null;
  },
  target: editRpcNodeFx,
});

sample({
  clock: checkRpcNodeFx.fail,
  fn: ({ error }: { error: Error }) => {
    console.warn(error);

    return RpcCheckResult.INIT;
  },
  target: rpcConnectivityChecked,
});

export const editCustomRpcModel = {
  $editCustomRpcForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isProcessStarted,
  $isLoading,

  events: {
    formInitiated,
    networkChanged,
    processStarted,
    nodeSelected,
  },
};
