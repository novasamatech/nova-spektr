import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { networkService } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { VerifyRpcConnectivityFxParams, EditRpcNodeFxParams, RpcConnectivityResult } from '../lib/custom-rpc-types';
import { manageNetworkModel } from '@pages/Settings/Networks/model/manage-network-model';
import { RpcNode } from '@shared/core';
import { customRpcConstants } from '../lib/custom-rpc-constants';
import { customRpcUtils } from '../lib/custom-rpc-utils';

const $editCustomRpcForm = createForm({
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

const formInitiated = createEvent();
const networkChanged = createEvent<ExtendedChain>();
const nodeSelected = createEvent<RpcNode>();
const rpcConnectivityVerified = createEvent<RpcConnectivityResult>();
const processStarted = createEvent<boolean>();

const $selectedNode = createStore<RpcNode | null>(null);
const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcConnectivityResult>(RpcConnectivityResult.INIT);
const $isProcessStarted = createStore<boolean>(false);
const $isLoading = createStore<boolean>(false);

const verifyRpcConnectivityFx = createEffect(
  async ({ chainId, url }: VerifyRpcConnectivityFxParams): Promise<RpcConnectivityResult> => {
    const validationResult = await networkService.validateRpcNode(chainId, url);

    return customRpcConstants.RpcValidationMapping[validationResult];
  },
);

const editRpcNodeFx = createEffect(async ({ network, form, nodeToEdit }: EditRpcNodeFxParams) => {
  manageNetworkModel.events.rpcNodeUpdated({
    chainId: network.chainId,
    oldNode: nodeToEdit,
    rpcNode: { url: form.url, name: form.name },
  });
});

const updateInitialValuesFx = createEffect(({ url, name }: RpcNode) => {
  $editCustomRpcForm.fields.url.onChange(url);
  $editCustomRpcForm.fields.name.onChange(name);
});

sample({
  clock: processStarted,
  target: $isProcessStarted,
});

sample({
  clock: formInitiated,
  target: [$rpcConnectivityResult.reinit, $editCustomRpcForm.reset],
});

sample({
  clock: verifyRpcConnectivityFx.pending,
  target: $isLoading,
});

sample({
  clock: $editCustomRpcForm.fields.url.onChange,
  target: $rpcConnectivityResult.reinit,
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
  clock: rpcConnectivityVerified,
  target: $rpcConnectivityResult,
});

// when the form is submitted, we need to check if the node is responding
sample({
  clock: $editCustomRpcForm.submit,
  source: { network: $selectedNetwork, url: $editCustomRpcForm.fields.url.$value },
  filter: (params: { network: ExtendedChain | null; url: string }): params is { network: ExtendedChain; url: string } =>
    !!params.network,
  fn: ({ network, url }) => ({ chainId: network.chainId, url }),
  target: verifyRpcConnectivityFx,
});

sample({
  clock: verifyRpcConnectivityFx.doneData,
  target: rpcConnectivityVerified,
});

// if we are done checking the form data and it is valid
// we can proceed with editing the rpc node
sample({
  clock: verifyRpcConnectivityFx.doneData,
  source: {
    rpcConnectivityResult: $rpcConnectivityResult,
    network: $selectedNetwork,
    form: $editCustomRpcForm.$values,
    nodeToEdit: $selectedNode,
    isFormValid: $editCustomRpcForm.$isValid,
  },
  filter: (params): params is EditRpcNodeFxParams => {
    const { rpcConnectivityResult, network, nodeToEdit, isFormValid } = params;

    return (
      isFormValid &&
      customRpcUtils.isRpcConnectivityValid(rpcConnectivityResult) &&
      network !== null &&
      nodeToEdit !== null
    );
  },
  target: editRpcNodeFx,
});

sample({
  clock: verifyRpcConnectivityFx.fail,
  fn: ({ error }: { error: Error }) => {
    console.warn(error);

    return RpcConnectivityResult.INIT;
  },
  target: rpcConnectivityVerified,
});

sample({
  clock: editRpcNodeFx.doneData,
  target: $isProcessStarted.reinit,
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
