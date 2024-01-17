import { createEvent, createStore, sample, combine } from 'effector';
import { createForm } from 'effector-forms';

import { Step } from '../lib/types';
import { Chain, Address, ProxyType } from '@shared/core';
import { networkModel, isRegularProxyAvailable } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { walletUtils } from '@entities/wallet';
import { getProxyTypes } from '@shared/lib/utils';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();
const formInitiated = createEvent();

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

// TODO: or look at txWrappers
const $isMultisig = combine(walletSelectModel.$walletForDetails, (wallet) => {
  return walletUtils.isMultisig(wallet);
});

const $proxyChains = combine(
  {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  ({ apis, chains }) => {
    return Object.values(chains).filter(({ chainId, options }) => {
      return apis[chainId]?.isConnected && isRegularProxyAvailable(options);
    });
  },
);

const $proxyTypes = combine(
  {
    apis: networkModel.$apis,
    chain: $proxyForm.fields.network.$value,
  },
  ({ apis, chain }) => {
    if (Object.keys(chain).length === 0) return [];

    return apis[chain.chainId]?.isConnected ? getProxyTypes(apis[chain.chainId]) : [];
  },
);

sample({ clock: formInitiated, target: $proxyForm.reset });

sample({
  clock: formInitiated,
  source: $proxyChains,
  fn: (chains) => chains[0],
  target: $proxyForm.fields.network.onChange,
});

sample({
  clock: $proxyForm.fields.network.$value,
  source: $proxyTypes,
  fn: (types) => types[0],
  target: $proxyForm.fields.proxyType.onChange,
});

sample({ clock: stepChanged, target: $steps });

export const addProxyModel = {
  $steps,
  $proxyForm,
  $proxyChains,
  $proxyTypes,
  $isMultisig,
  events: {
    stepChanged,
    formInitiated,
  },
};
