import { createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { validateWsAddress } from '@renderer/shared/lib/utils';
import { networkService, RpcValidation } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { CustomRpcForm, NodeExistParam, RpcCheckResult } from '../lib/types';
import { manageNetworkModel } from '@/src/renderer/pages/Settings/Networks/model/manage-network-model';

const $customRpcCreationForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'settings.networks.requiredNameError', validator: Boolean },
        {
          name: 'maxLength',
          errorText: 'settings.networks.maxLengthNameError',
          validator: (val) => val.length <= 50 && val.length >= 3,
        },
      ],
      validateOn: ['blur'],
    },
    url: {
      init: '',
      rules: [
        { name: 'required', errorText: 'settings.networks.addressEmpty', validator: Boolean },
        { name: 'wsAddressValidation', errorText: 'settings.networks.addressInvalidUrl', validator: validateWsAddress },
      ],
    },
  },
  validateOn: ['submit'],
});

const formInitiated = createEvent();
const networkChanged = createEvent<ExtendedChain>();
const rpcConnectivityChecked = createEvent<RpcCheckResult>();
const isNodeExistChecked = createEvent<boolean>();
const processStarted = createEvent<boolean>();

const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $rpcConnectivityResult = createStore<RpcCheckResult>(RpcCheckResult.INIT);
const $isNodeExist = createStore<boolean>(false);
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
    isNodeExistChecked(false);

    return false;
  }

  const defaultNodes = network.nodes;
  const customNodes = network.connection.customNodes || [];

  const result = defaultNodes.some(({ url: u }) => u === url) || customNodes.some(({ url: u }) => u === url);

  isNodeExistChecked(result);

  return result;
});

const resetFormFx = createEffect(() => {
  resetRpcValidationFx();
  $customRpcCreationForm.reset;
});

const resetRpcValidationFx = createEffect(() => {
  isNodeExistChecked(false);
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
  clock: $customRpcCreationForm.fields.url.onChange,
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
  clock: isNodeExistChecked,
  target: $isNodeExist,
});

// when the form is submitted, we need to check if the node is responding
sample({
  clock: $customRpcCreationForm.submit,
  source: { network: $selectedNetwork, url: $customRpcCreationForm.fields.url.$value },
  target: [checkRpcNodeFx, isNodeExistFx],
});

// if we are done checking the form data and it is valid
// we can proceed with saving the new rpc node
sample({
  clock: [isNodeExistFx.doneData, checkRpcNodeFx.doneData],
  source: {
    rpcConnectivityResult: $rpcConnectivityResult,
    isNodeExist: $isNodeExist,
    network: $selectedNetwork,
    form: $customRpcCreationForm.$values,
  },
  filter: ({ isNodeExist, rpcConnectivityResult }) => {
    return !isNodeExist && rpcConnectivityResult === RpcCheckResult.VALID;
  },
  target: saveRpcNodeFx,
});

export const customRpcCreationModel = {
  $customRpcCreationForm,
  $rpcConnectivityResult,
  $selectedNetwork,
  $isNodeExist,
  $isProcessStarted,

  events: {
    formInitiated,
    networkChanged,
    processStarted,
  },
};
