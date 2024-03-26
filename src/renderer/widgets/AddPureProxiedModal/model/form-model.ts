import { createEvent, createStore, sample, combine, createEffect, restore } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';
import { spread } from 'patronum';

import { Address, ProxyType, Chain, Account, PartialBy } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { proxiesUtils } from '@features/proxies/lib/proxies-utils';
import { walletUtils, accountUtils, walletModel, permissionUtils } from '@entities/wallet';
import { proxyService } from '@shared/api/proxy';
import { TransactionType, Transaction } from '@entities/transaction';
import { balanceModel, balanceUtils } from '@entities/balance';
import {
  getProxyTypes,
  isStringsMatchQuery,
  toAddress,
  TEST_ACCOUNTS,
  dictionary,
  transferableAmount,
} from '@shared/lib/utils';

type ProxyAccounts = {
  accounts: {
    address: Address;
    proxyType: ProxyType;
  }[];
  deposit: string;
};

type FormParams = {
  chain: Chain;
  account: Account;
  signatory: Account;
  description: string;
};

type FormSubmitEvent = PartialBy<FormParams, 'signatory'> & {
  proxyDeposit: string;
  oldProxyDeposit: string;
  proxyNumber: number;
};

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const feeChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

// Deposits

const $oldProxyDeposit = createStore<string>('0');
const $newProxyDeposit = restore(proxyDepositChanged, '0');
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, false);
const $multisigDeposit = restore(multisigDepositChanged, '0');
const $fee = restore(feeChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, false);

const $proxyQuery = createStore<string>('');
const $maxProxies = createStore<number>(0);
const $activeProxies = createStore<ProxyAccounts['accounts']>([]);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $proxyForm = createForm<FormParams>({
  fields: {
    chain: {
      init: {} as Chain,
      rules: [
        {
          name: 'maxProxies',
          errorText: 'proxy.addProxy.maxProxiesError',
          source: combine({
            maxProxies: $maxProxies,
            proxies: $activeProxies,
          }),
          validator: (_v, _f, { maxProxies, proxies }) => maxProxies > proxies.length,
        },
      ],
    },
    account: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          source: combine({
            fee: $fee,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          validator: (value, form, { isMultisig, balances, ...params }) => {
            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              form.chain.assets[0].assetId.toString(),
            );

            return isMultisig
              ? new BN(params.proxyDeposit).lte(new BN(transferableAmount(balance)))
              : new BN(params.proxyDeposit).add(new BN(params.fee)).lte(new BN(transferableAmount(balance)));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          validator: (value, form, { isMultisig, balances, ...params }) => {
            if (!isMultisig) return true;

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              form.chain.assets[0].assetId.toString(),
            );

            return new BN(params.multisigDeposit)
              .add(new BN(params.fee))
              .lte(new BN(transferableAmount(signatoryBalance)));
          },
        },
      ],
    },
    description: {
      init: '',
      rules: [
        {
          name: 'maxLength',
          validator: (value) => !value || value.length <= 120,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Options for selectors

const $proxyChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter(proxiesUtils.isPureProxy);
});

const $proxiedAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
    chain: $proxyForm.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, accounts, chain, balances }) => {
    if (!wallet || !chain.assets) return [];

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
    chain: $proxyForm.fields.chain.$value,
    accounts: walletModel.$accounts,
    balances: balanceModel.$balances,
  },
  ({ wallet, wallets, account, accounts, chain, balances }) => {
    if (!wallet || !chain || !account || !accountUtils.isMultisigAccount(account)) return [];

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
    chain: $proxyForm.fields.chain.$value,
    query: $proxyQuery,
  },
  ({ wallets, accounts, chain, query }) => {
    if (!chain) return [];

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
    chain: $proxyForm.fields.chain.$value,
  },
  ({ apis, statuses, chain }) => {
    if (!chain) return [];

    return networkUtils.isConnectedStatus(statuses[chain.chainId])
      ? getProxyTypes(apis[chain.chainId])
      : [ProxyType.ANY];
  },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: $proxyForm.fields.chain.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    form: $proxyForm.$values,
  },
  ({ apis, form }) => {
    if (!form.chain.chainId) return undefined;

    return apis[form.chain.chainId];
  },
  { skipVoid: false },
);

const $fakeTx = combine(
  {
    chain: $proxyForm.fields.chain.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain || !isConnected) return undefined;

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

const $canSubmit = combine(
  {
    isFormValid: $proxyForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isProxyDepositLoading: $isProxyDepositLoading,
  },
  ({ isFormValid, isFeeLoading, isProxyDepositLoading }) => {
    return isFormValid && !isFeeLoading && !isProxyDepositLoading;
  },
);

type ProxyParams = {
  api: ApiPromise;
  address: Address;
};
const getAccountProxiesFx = createEffect(({ api, address }: ProxyParams): Promise<ProxyAccounts> => {
  return proxyService.getProxiesForAccount(api, address);
});

const getMaxProxiesFx = createEffect((api: ApiPromise): number => {
  return proxyService.getMaxProxies(api);
});

// Fields connections

sample({
  clock: formInitiated,
  target: [$proxyForm.reset, $proxyQuery.reinit],
});

sample({
  clock: formInitiated,
  source: $proxyChains,
  fn: (chains) => chains[0],
  target: $proxyForm.fields.chain.onChange,
});

sample({
  clock: proxyQueryChanged,
  target: $proxyQuery,
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  target: [
    $proxyQuery.reinit,
    $proxyForm.fields.chain.resetErrors,
    $proxyForm.fields.account.resetErrors,
    $proxyForm.fields.signatory.resetErrors,
  ],
});

sample({
  clock: $proxyForm.fields.chain.onChange,
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
  filter: (_, account) => Boolean(account),
  fn: ({ wallet, wallets }, account): Record<string, boolean> => {
    if (!wallet) return { isMultisig: false, isProxy: false };
    if (walletUtils.isMultisig(wallet)) return { isMultisig: true, isProxy: false };
    if (!walletUtils.isProxied(wallet)) return { isMultisig: false, isProxy: false };

    const accountWallet = walletUtils.getWalletById(wallets, account!.walletId);

    return {
      isMultisig: walletUtils.isMultisig(accountWallet),
      isProxy: true,
    };
  },
  target: spread({
    isMultisig: $isMultisig,
    isProxy: $isProxy,
  }),
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  source: {
    signatories: $signatories,
    isMultisig: $isMultisig,
  },
  filter: ({ isMultisig, signatories }) => {
    return isMultisig && signatories.length > 0;
  },
  fn: ({ signatories }) => signatories[0].signer,
  target: $proxyForm.fields.signatory.onChange,
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  source: networkModel.$apis,
  filter: (_, chain) => Boolean(chain),
  fn: (apis, chain) => apis[chain!.chainId],
  target: getMaxProxiesFx,
});

sample({
  clock: getMaxProxiesFx.done,
  source: {
    chain: $proxyForm.fields.chain.$value,
    apis: networkModel.$apis,
  },
  filter: ({ chain, apis }, { params }) => {
    return apis[chain.chainId].genesisHash === params.genesisHash;
  },
  fn: (_, { result }) => result,
  target: $maxProxies,
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  source: {
    apis: networkModel.$apis,
    account: $proxyForm.fields.account.$value,
    isChainConnected: $isChainConnected,
  },
  filter: ({ isChainConnected, account }) => isChainConnected && Boolean(account),
  fn: ({ apis, account }, chain) => ({
    api: apis[chain.chainId],
    address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
  }),
  target: getAccountProxiesFx,
});

sample({
  clock: getAccountProxiesFx.done,
  source: {
    chain: $proxyForm.fields.chain.$value,
    apis: networkModel.$apis,
  },
  filter: ({ chain, apis }, { params }) => {
    return apis[chain.chainId].genesisHash === params.api.genesisHash;
  },
  fn: (_, { result }) => ({
    activeProxies: result.accounts,
    oldProxyDeposit: result.deposit,
  }),
  target: spread({
    activeProxies: $activeProxies,
    oldProxyDeposit: $oldProxyDeposit,
  }),
});

// Submit

sample({
  clock: $proxyForm.formValidated,
  source: {
    newProxyDeposit: $newProxyDeposit,
    oldProxyDeposit: $oldProxyDeposit,
    proxies: $activeProxies,
  },
  fn: ({ newProxyDeposit, oldProxyDeposit, proxies }, formData) => {
    const signatory = Object.keys(formData.signatory).length > 0 ? formData.signatory : undefined;
    const proxied = toAddress(formData.account.accountId, {
      prefix: formData.chain.addressPrefix,
    });
    const multisigDescription = `Add pure proxy for ${proxied}`; // TODO: update after i18n effector integration
    const description = signatory ? formData.description || multisigDescription : '';

    return {
      ...formData,
      signatory,
      description,
      proxyDeposit: newProxyDeposit,
      oldProxyDeposit,
      proxyNumber: proxies.length + 1,
    };
  },
  target: formSubmitted,
});

export const formModel = {
  $proxyForm,
  $proxyChains,
  $proxiedAccounts,
  $signatories,
  $proxyAccounts,
  $proxyTypes,
  $proxyQuery,

  $activeProxies,
  $oldProxyDeposit,
  $newProxyDeposit,
  $multisigDeposit,
  $fee,

  $api,
  $fakeTx,
  $isMultisig,
  $isChainConnected,
  $canSubmit,

  events: {
    formInitiated,
    proxyQueryChanged,
    proxyDepositChanged,
    multisigDepositChanged,
    feeChanged,
    isFeeLoadingChanged,
    isProxyDepositLoadingChanged,
  },

  output: {
    formSubmitted,
  },
};
