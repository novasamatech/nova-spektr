import { createEvent, createStore, sample, combine } from 'effector';
import { createForm } from 'effector-forms';

import { Step } from '../lib/types';
import { Chain, Address, ProxyType } from '@shared/core';
import { networkModel, isRegularProxyAvailable, networkUtils } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { walletUtils, accountUtils, walletModel } from '@entities/wallet';
import { getProxyTypes, isStringsMatchQuery, toAddress } from '@shared/lib/utils';

export type Callbacks = {
  onClose: () => void;
};

const formInitiated = createEvent();
const proxyQueryChanged = createEvent<string>();

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
$proxyForm.fields.proxyAddress.$value.watch(console.log);

const $proxyQuery = createStore<string>('');

const $proxiedAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
    chain: $proxyForm.fields.network.$value,
  },
  ({ wallet, accounts, chain }) => {
    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const isMultishard = walletUtils.isMultiShard(wallet);

    if (!wallet || (!isPolkadotVault && !isMultishard)) return [];

    return accountUtils.getWalletAccounts(wallet.id, accounts).filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainIdMatch(account, chain.chainId);
    });
  },
);

// TODO: or look at txWrappers
const $isMultisig = combine(walletSelectModel.$walletForDetails, (wallet) => {
  return walletUtils.isMultisig(wallet);
});

const $proxyChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => isRegularProxyAvailable(chain.options));
});

const $isChainConnected = combine(
  {
    chain: $proxyForm.fields.network.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => networkUtils.isConnected(statuses[chain.chainId]),
);

const $proxyTypes = combine(
  {
    apis: networkModel.$apis,
    statuses: networkModel.$connectionStatuses,
    chain: $proxyForm.fields.network.$value,
  },
  ({ apis, statuses, chain }) => {
    return networkUtils.isConnected(statuses[chain.chainId]) ? getProxyTypes(apis[chain.chainId]) : [ProxyType.ANY];
  },
);

const $proxyAccounts = combine(
  {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    chain: $proxyForm.fields.network.$value,
    query: $proxyQuery,
  },
  ({ wallets, accounts, chain, query }) => {
    return accountUtils.getAccountsForBalances(wallets, accounts, (account) => {
      const isChainMatch = accountUtils.isChainIdMatch(account, chain.chainId);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      return isChainMatch && isStringsMatchQuery(query, [account.name, address]);
    });
  },
);

sample({
  clock: formInitiated,
  target: [$proxyForm.reset, $proxyQuery.reinit],
});

sample({
  clock: formInitiated,
  source: $proxyChains,
  fn: (chains) => chains[0],
  target: $proxyForm.fields.network.onChange,
});

sample({ clock: proxyQueryChanged, target: $proxyQuery });

sample({
  clock: $proxyForm.fields.network.$value,
  source: $proxyTypes,
  fn: (types) => types[0],
  target: $proxyForm.fields.proxyType.onChange,
});

sample({
  clock: $proxyForm.fields.network.onChange,
  target: [$proxyForm.fields.account.reset, $proxyForm.fields.proxyAddress.reset],
});

export const proxyFormModel = {
  $steps,
  $proxyForm,
  $proxyQuery,

  $proxyChains,
  $proxyTypes,
  $proxiedAccounts,
  $proxyAccounts,

  $isMultisig,
  $isChainConnected,
  events: {
    formInitiated,
    proxyQueryChanged,
  },
};
