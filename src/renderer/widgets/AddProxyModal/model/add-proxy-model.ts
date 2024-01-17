import { createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { Step } from '../lib/types';
import { Chain, Address, ProxyType } from '@shared/core';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();

const $steps = createStore<Step>(Step.INIT);

const $proxyForm = createForm({
  fields: {
    network: {
      init: {} as Chain,
    },
    account: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'proxied_address_error',
          validator: Boolean,
        },
      ],
    },
    signatory: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'signatory_error',
          validator: Boolean,
        },
      ],
    },
    proxyAddress: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'proxy_address_error',
          validator: Boolean,
        },
      ],
    },
    proxyType: {
      init: '' as ProxyType,
      rules: [
        {
          name: 'required',
          errorText: 'proxy_type_error',
          validator: Boolean,
        },
      ],
    },
    description: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'description_error',
          validator: Boolean,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

sample({ clock: stepChanged, target: $steps });

export const addProxyModel = {
  $steps,
  $proxyForm,
  events: {
    stepChanged,
  },
};
