import { createEffect, createEvent, createStore } from 'effector';
import { createForm } from 'effector-forms';
import { sample } from 'lodash';

import { networkService, RpcValidation } from '@shared/api/network';
import { ExtendedChain } from '@entities/network';
import { FormState } from '../lib/types';

const $createRpcNodeForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'settings.networks.requiredNameError', validator: Boolean },
        {
          name: 'maxLength',
          errorText: 'settings.networks.maxLengthNameError',
          validator: (val) => val.length < 50 || val.length > 3,
        },
      ],
      validateOn: ['blur'],
    },
    url: {
      init: '',
      rules: [{ name: 'required', errorText: 'settings.networks.addressEmpty', validator: Boolean }],
      //       {/* <InputHint active={formState !== FormState.VALID && !errors.url && !isNodeExist()} variant="hint">
      //   {t('settings.networks.addressHint')}
      // </InputHint>
      // <InputHint active={formState === FormState.INIT && !errors.url && isNodeExist()} variant="error">
      //   {t('settings.networks.nodeExist')}
      // </InputHint>
      // <InputHint active={formState === FormState.INIT && errors.url?.type === 'validate'} variant="error">
      //   {t('settings.networks.addressInvalidUrl')}
      // </InputHint>
      // <InputHint active={formState === FormState.VALID} variant="success">
      //   {t('settings.networks.addressConnected')}
      // </InputHint> */}
    },
  },
  validateOn: ['submit'],
});

const formInitiated = createEvent();
const networkChanged = createEvent<ExtendedChain>();
const formStateChanged = createEvent<FormState>();

const $selectedNetwork = createStore<ExtendedChain | null>(null);
const $formState = createStore<FormState>(FormState.INIT);

const checkRpcNodeFx = createEffect(async ({ network, url }: { network: ExtendedChain; url: string }) => {
  console.log('go', network, url);
  if (!$selectedNetwork) return;

  try {
    formStateChanged(FormState.LOADING);
    const result = await networkService.validateRpcNode(network.chainId, url);

    const options = {
      [RpcValidation.INVALID]: () => formStateChanged(FormState.INVALID),
      [RpcValidation.VALID]: () => formStateChanged(FormState.VALID),
      [RpcValidation.WRONG_NETWORK]: () => formStateChanged(FormState.WRONG_NETWORK),
    };
    options[result]();
  } catch (error) {
    console.warn(error);
  }
});

sample({
  clock: networkChanged,
  target: $selectedNetwork,
});

sample({
  clock: formStateChanged,
  target: $formState,
});

// when the form is submitted, we need to check if the node is responding
sample({
  clock: $createRpcNodeForm.submit,
  source: { network: $selectedNetwork, url: $createRpcNodeForm.fields.url },
  target: checkRpcNodeFx,
});

$createRpcNodeForm.submit.watch(() => {
  console.log('form submited');
});

export const createRpcNodeModel = {
  $createRpcNodeForm,
  $formState,
  $selectedNetwork,

  events: {
    formInitiated,
    networkChanged,
  },
};
