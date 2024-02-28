import { createEvent, createStore, sample, combine, createEffect, createApi } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';

import { ActiveProxy } from '../lib/types';
import { Address, ProxyType, Chain, Account } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { proxiesUtils } from '@features/proxies/lib/proxies-utils';
import { walletUtils, accountUtils, walletModel, permissionUtils } from '@entities/wallet';
import { proxyService } from '@shared/api/proxy';
import { TransactionType, Transaction } from '@entities/transaction';
import { balanceModel, balanceUtils } from '@entities/balance';
import { addProxyUtils } from '../lib/add-proxy-utils';
import {
  getProxyTypes,
  isStringsMatchQuery,
  toAddress,
  TEST_ACCOUNTS,
  dictionary,
  transferableAmount,
} from '@shared/lib/utils';

const formInitiated = createEvent();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const feeChanged = createEvent<string>();

export type TxWrapper = ('proxy' | 'multisig')[];

const $proxyDeposit = createStore<string>('0');
const $multisigDeposit = createStore<string>('0');
const $fee = createStore<string>('0');

const $proxyQuery = createStore<string>('');
const $maxProxies = createStore<number>(0);
const $activeProxies = createStore<ActiveProxy[]>([]);

const $txWrappers = createStore<TxWrapper>([]);

export type Callbacks = {
  onSubmit: (formData: FormValues) => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

type FormValues = {
  network: Chain;
  account: Account;
  signatory: Account;
  delegate: Address;
  proxyType: ProxyType;
  description: string;
};
const $proxyForm = createForm<FormValues>({
  fields: {
    network: {
      init: {} as Chain,
    },
    account: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'no_tokens_for_fee_deposit_error',
          source: combine({
            fee: $fee,
            proxyDeposit: $proxyDeposit,
            balances: balanceModel.$balances,
            txWrappers: $txWrappers,
          }),
          validator: (value, form, { txWrappers, balances, ...params }) => {
            if (addProxyUtils.hasMultisig(txWrappers)) return true;

            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.network.chainId,
              form.network.assets[0].assetId.toString(),
            );

            return new BN(params.proxyDeposit).add(new BN(params.fee)).lte(new BN(transferableAmount(balance)));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'no_tokens_for_fee_deposit_error',
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            proxyDeposit: $proxyDeposit,
            balances: balanceModel.$balances,
            txWrappers: $txWrappers,
          }),
          validator: (value, form, { txWrappers, balances, ...params }) => {
            if (!addProxyUtils.hasMultisig(txWrappers)) return true;

            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.network.chainId,
              form.network.assets[0].assetId.toString(),
            );

            return new BN(params.proxyDeposit)
              .add(new BN(params.multisigDeposit))
              .add(new BN(params.fee))
              .lte(new BN(transferableAmount(balance)));
          },
        },
      ],
    },
    delegate: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'proxy_address_error',
          validator: Boolean,
        },
        {
          name: 'sameAsProxied',
          errorText: 'same_as_proxied_error',
          validator: (value, { account, network }) => {
            return value !== toAddress(account.accountId, { prefix: network.addressPrefix });
          },
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
          name: 'maxLength',
          errorText: 'description_error',
          validator: (value) => !value || value.length <= 120,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $proxyChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter(proxiesUtils.isRegularProxy);
});

const $proxiedAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
    chain: $proxyForm.fields.network.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, accounts, chain, balances }) => {
    if (!wallet) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts).filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainIdMatch(account, chain.chainId);
    });

    return walletAccounts.map((account) => {
      const balance = balances.find((balance) => {
        return (
          balance.chainId === chain.chainId &&
          balance.accountId === account.accountId &&
          balance.assetId === chain.assets[0].assetId.toString()
        );
      });

      return { account, balance: transferableAmount(balance) };
    });
  },
);

const $signatories = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    account: $proxyForm.fields.account.$value,
    chain: $proxyForm.fields.network.$value,
    accounts: walletModel.$accounts,
    balances: balanceModel.$balances,
  },
  ({ wallet, wallets, account, accounts, chain, balances }) => {
    if (!wallet || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balance: string }[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
      const isAvailable = permissionUtils.canCreateMultisigTx(wallet, walletAccounts);

      if (!isAvailable) return acc;

      const signer = walletAccounts.find((a) => {
        return signers[a.accountId] && accountUtils.isChainIdMatch(a, chain.chainId);
      });

      if (signer) {
        const balance = balances.find((balance) => {
          return (
            balance.chainId === chain.chainId &&
            balance.accountId === signer.accountId &&
            balance.assetId === chain.assets[0].assetId.toString()
          );
        });

        acc.push({ signer, balance: transferableAmount(balance) });
      }

      return acc;
    }, []);
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
      const isShardAccount = accountUtils.isShardAccount(account);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      return isChainMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });
  },
);

const $proxyTypes = combine(
  {
    apis: networkModel.$apis,
    statuses: networkModel.$connectionStatuses,
    chain: $proxyForm.fields.network.$value,
  },
  ({ apis, statuses, chain }) => {
    return networkUtils.isConnectedStatus(statuses[chain.chainId])
      ? getProxyTypes(apis[chain.chainId])
      : [ProxyType.ANY];
  },
);

const $isChainConnected = combine(
  {
    chain: $proxyForm.fields.network.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $fakeTx = combine(
  {
    chain: $proxyForm.fields.network.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!isConnected) return undefined;

    return {
      chainId: chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: {
        delegate: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
        proxyType: ProxyType.ANY,
        delay: 0,
      },
    };
  },
  { skipVoid: false },
);

type ProxyParams = {
  api: ApiPromise;
  address: Address;
};
const getAccountProxiesFx = createEffect(({ api, address }: ProxyParams): Promise<ActiveProxy[]> => {
  return proxyService.getProxiesForAccount(api, address);
});

const getMaxProxiesFx = createEffect((api: ApiPromise): number => {
  return proxyService.getMaxProxies(api);
});

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

sample({
  clock: proxyQueryChanged,
  target: $proxyQuery,
});

sample({
  clock: [$proxyForm.fields.delegate.onChange, $proxyForm.fields.proxyType.onChange],
  target: $proxyForm.fields.delegate.resetErrors,
});

sample({
  clock: $proxyForm.fields.network.onChange,
  target: [
    $proxyQuery.reinit,
    $proxyForm.fields.delegate.reset,
    $proxyForm.fields.network.resetErrors,
    $proxyForm.fields.account.resetErrors,
    $proxyForm.fields.signatory.resetErrors,
  ],
});

sample({
  clock: $proxyForm.fields.network.onChange,
  source: $proxiedAccounts,
  fn: (proxiedAccounts) => proxiedAccounts[0].account,
  target: $proxyForm.fields.account.onChange,
});

sample({
  clock: $proxyForm.fields.account.onChange,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  fn: ({ wallet, wallets }, account): TxWrapper => {
    if (!wallet) return [];
    if (walletUtils.isMultisig(wallet)) return ['multisig'];
    if (!walletUtils.isProxied(wallet)) return [];

    const accountWallet = walletUtils.getWalletById(wallets, account.walletId);

    return walletUtils.isMultisig(accountWallet) ? ['proxy', 'multisig'] : ['proxy'];
  },
  target: $txWrappers,
});

sample({
  clock: $proxyForm.fields.network.onChange,
  source: {
    signatories: $signatories,
    txWrappers: $txWrappers,
  },
  filter: ({ txWrappers, signatories }) => {
    return addProxyUtils.hasMultisig(txWrappers) && signatories.length > 0;
  },
  fn: ({ signatories }) => signatories[0].signer,
  target: $proxyForm.fields.signatory.onChange,
});

sample({
  clock: $proxyForm.fields.network.onChange,
  source: $proxyTypes,
  fn: (types) => types[0],
  target: $proxyForm.fields.proxyType.onChange,
});

sample({
  clock: $proxyForm.fields.network.onChange,
  source: networkModel.$apis,
  fn: (apis, chain) => apis[chain.chainId],
  target: getMaxProxiesFx,
});

sample({
  clock: getMaxProxiesFx.doneData,
  target: $maxProxies,
});

// DEPOSITS

sample({
  clock: proxyDepositChanged,
  target: $proxyDeposit,
});

sample({
  clock: multisigDepositChanged,
  target: $multisigDeposit,
});

sample({
  clock: feeChanged,
  target: $fee,
});

// SUBMIT

sample({
  clock: $proxyForm.formValidated,
  source: {
    apis: networkModel.$apis,
    form: $proxyForm.$values,
  },
  filter: $isChainConnected,
  fn: ({ apis, form }) => ({
    api: apis[form.network.chainId],
    address: toAddress(form.account.accountId, { prefix: form.network.addressPrefix }),
  }),
  target: getAccountProxiesFx,
});

sample({
  clock: getAccountProxiesFx.doneData,
  target: $activeProxies,
});

sample({
  clock: getAccountProxiesFx.doneData,
  source: $maxProxies,
  filter: (maxProxies, activeProxies) => maxProxies === activeProxies.length,
  fn: () => ({
    rule: 'maxProxies',
    errorText: 'max_proxies_error',
  }),
  target: $proxyForm.fields.network.addError,
});

sample({
  clock: getAccountProxiesFx.doneData,
  source: {
    delegate: $proxyForm.fields.delegate.$value,
    proxyType: $proxyForm.fields.proxyType.$value,
  },
  filter: ({ delegate, proxyType }, activeProxies) => {
    return activeProxies.some((proxy) => proxy.proxyType === proxyType && proxy.address === delegate);
  },
  fn: () => ({
    rule: 'proxyExists',
    errorText: 'proxy_exists_error',
  }),
  target: $proxyForm.fields.delegate.addError,
});

// sample({
//   clock: $proxyForm.formValidated,
//   target: attach({
//     source: $callbacks,
//     effect: (state, formData: FormValues) => state?.onSubmit(formData),
//   }),
// });

export const proxyFormModel = {
  $proxyForm,
  $proxyQuery,

  $proxyChains,
  $proxyTypes,
  $proxiedAccounts,
  $proxyAccounts,

  $fakeTx,
  $proxyDeposit,
  $multisigDeposit,
  $fee,

  $signatories,
  $txWrappers,
  $isChainConnected,
  $isLoading: getAccountProxiesFx.pending,
  events: {
    formInitiated,
    callbacksChanged: callbacksApi.callbacksChanged,
    proxyQueryChanged,

    proxyDepositChanged,
    multisigDepositChanged,
    feeChanged,
  },
};
