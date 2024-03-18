import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { networkService, RpcValidation } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { CustomRpcForm, RpcCheckResult } from '../lib/types';
import { manageNetworkModel } from '@pages/Settings/Networks/model/manage-network-model';
import { fieldRules } from '../lib/utils';
import { RpcNode } from '@shared/core';

const $editCustomRpcForm = createForm({
  fields: {
    name: {
      init: '',
      rules: fieldRules.name,
      validateOn: ['blur'],
    },
    url: {
      init: '',
      rules: fieldRules.url,
    },
  },
  validateOn: ['submit'],
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

const checkRpcNodeFx = createEffect(
  async ({ network, url }: { network: ExtendedChain | null; url: string }): Promise<RpcCheckResult | null> => {
    if (!network) return null;

    try {
      rpcConnectivityChecked(RpcCheckResult.LOADING);
      const validationResult = await networkService.validateRpcNode(network.chainId, url);

      const RpcValidationMapping = {
        [RpcValidation.INVALID]: RpcCheckResult.INVALID,
        [RpcValidation.VALID]: RpcCheckResult.VALID,
        [RpcValidation.WRONG_NETWORK]: RpcCheckResult.WRONG_NETWORK,
      };

      const result = RpcValidationMapping[validationResult];
      rpcConnectivityChecked(result);

      return result;
    } catch (error) {
      console.warn(error);

      return null;
    }
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
  target: checkRpcNodeFx,
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

export const editCustomRpcModel = {
  $editCustomRpcForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isProcessStarted,

  events: {
    formInitiated,
    networkChanged,
    processStarted,
    nodeSelected,
  },
};
