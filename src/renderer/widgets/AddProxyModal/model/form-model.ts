import { createEvent, createStore, sample, combine, createEffect } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';
import { spread } from 'patronum';

import { Address, ProxyType, Chain, Account, PartialBy, ProxiedAccount } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { proxiesUtils } from '@features/proxies/lib/proxies-utils';
import { walletUtils, accountUtils, walletModel, permissionUtils } from '@entities/wallet';
import { proxyService } from '@shared/api/proxy';
import {
  TransactionType,
  Transaction,
  ProxyTxWrapper,
  MultisigTxWrapper,
  transactionService,
  DESCRIPTION_LENGTH,
} from '@entities/transaction';
import { balanceModel, balanceUtils } from '@entities/balance';
import {
  getProxyTypes,
  isStringsMatchQuery,
  toAddress,
  TEST_ACCOUNTS,
  dictionary,
  transferableAmount,
  toShortAddress,
  validateAddress,
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
  delegate: Address;
  proxyType: ProxyType;
  description: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: PartialBy<FormParams, 'signatory'> & {
    proxiedAccount?: ProxiedAccount;
    fee: string;
    multisigDeposit: string;
    proxyDeposit: string;
    proxyNumber: number;
  };
};

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const feeChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $fee = createStore<string>('0').reset(formSubmitted);
const $oldProxyDeposit = createStore<string>('0').reset(formSubmitted);
const $newProxyDeposit = createStore<string>('0').reset(formSubmitted);
const $multisigDeposit = createStore<string>('0').reset(formSubmitted);
const $isFeeLoading = createStore<boolean>(true).reset(formSubmitted);
const $isProxyDepositLoading = createStore<boolean>(true).reset(formSubmitted);

const $proxyQuery = createStore<string>('').reset(formSubmitted);
const $maxProxies = createStore<number>(0).reset(formSubmitted);
const $activeProxies = createStore<ProxyAccounts['accounts']>([]).reset(formSubmitted);

const $isMultisig = createStore<boolean>(false).reset(formSubmitted);
const $isProxy = createStore<boolean>(false).reset(formSubmitted);

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
    delegate: {
      init: '' as Address,
      rules: [
        {
          name: 'required',
          errorText: 'proxy.addProxy.proxyAddressRequiredError',
          validator: validateAddress,
        },
        {
          name: 'sameAsProxied',
          errorText: 'proxy.addProxy.sameAsProxiedError',
          validator: (value, { account, chain }) => {
            return value !== toAddress(account.accountId, { prefix: chain.addressPrefix });
          },
        },
        {
          name: 'proxyTypeExist',
          errorText: 'proxy.addProxy.proxyTypeExistError',
          source: $activeProxies,
          validator: (value, { proxyType }, activeProxies: ProxyAccounts['accounts']) => {
            const sameProxyExist = activeProxies.some((proxy) => {
              return proxy.proxyType === proxyType && proxy.address === value;
            });

            return !sameProxyExist;
          },
        },
      ],
    },
    proxyType: {
      init: '' as ProxyType,
    },
    description: {
      init: '',
      rules: [
        {
          name: 'maxLength',
          validator: (value) => !value || value.length <= DESCRIPTION_LENGTH,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Options for selectors

const $txWrappers = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    account: $proxyForm.fields.account.$value,
    chain: $proxyForm.fields.chain.$value,
    accounts: walletModel.$accounts,
  },
  ({ wallet, account, chain, accounts, wallets }) => {
    if (!wallet || !chain || !account.id) return [];

    const walletFiltered = wallets.filter((wallet) => {
      return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
    });
    const walletsMap = dictionary(walletFiltered, 'id');
    const chainFilteredAccounts = accounts.filter((account) => {
      if (accountUtils.isBaseAccount(account) && walletUtils.isPolkadotVault(walletsMap[account.walletId])) {
        return false;
      }

      return accountUtils.isChainAndCryptoMatch(account, chain);
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account,
      accounts: chainFilteredAccounts,
      signatories: [],
    });
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $proxyForm.fields.account.$value,
  },
  ({ txWrappers, account }) => {
    if (txWrappers.length === 0) return account;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $proxyChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter(proxiesUtils.isRegularProxy);
});

const $proxiedAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
    chain: $proxyForm.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, accounts, chain, balances }) => {
    if (!wallet || !chain.chainId) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts).filter((account) => {
      if (isPolkadotVault && accountUtils.isBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(
        balances,
        account.accountId,
        chain.chainId,
        chain.assets[0].assetId.toString(),
      );

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
    if (!wallet || !chain.chainId || !account || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balance: string }[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
      const isAvailable = permissionUtils.canCreateMultisigTx(wallet, walletAccounts);

      if (!isAvailable) return acc;

      const signer = walletAccounts.find((a) => {
        return signers[a.accountId] && accountUtils.isChainAndCryptoMatch(a, chain);
      });

      if (signer) {
        const balance = balanceUtils.getBalance(
          balances,
          signer.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );

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
    if (!chain.chainId) return [];

    return accountUtils.getAccountsForBalances(wallets, accounts, (account) => {
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, chain);
      const isShardAccount = accountUtils.isShardAccount(account);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
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
    if (!chain.chainId) return [];

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
    if (!chain.chainId) return false;

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

const $pureTx = combine(
  {
    form: $proxyForm.$values,
    account: $realAccount,
    isConnected: $isChainConnected,
  },
  ({ form, account, isConnected }): Transaction | undefined => {
    if (!isConnected || !account) return undefined;

    return {
      chainId: form.chain.chainId,
      address: toAddress(account.accountId, { prefix: form.chain.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: {
        delegate: toAddress(form.delegate, { prefix: form.chain.addressPrefix }),
        proxyType: form.proxyType,
        delay: 0,
      },
    };
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    chain: $proxyForm.fields.chain.$value,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ apis, chain, pureTx, txWrappers }) => {
    if (!chain || !pureTx) return undefined;

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction: pureTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

const $fakeTx = combine(
  {
    chain: $proxyForm.fields.chain.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain.chainId || !isConnected) return undefined;

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
  clock: [$proxyForm.fields.delegate.onChange, $proxyForm.fields.proxyType.onChange],
  target: [$proxyForm.fields.delegate.resetErrors, $proxyForm.fields.proxyType.resetErrors],
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  target: [
    $proxyQuery.reinit,
    $proxyForm.fields.chain.resetErrors,
    $proxyForm.fields.account.resetErrors,
    $proxyForm.fields.signatory.resetErrors,
    $proxyForm.fields.delegate.reset,
  ],
});

sample({
  clock: $proxyForm.fields.chain.onChange,
  source: $proxiedAccounts,
  filter: (proxiedAccounts) => proxiedAccounts.length > 0,
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
  source: $proxyTypes,
  fn: (types) => types[0],
  target: $proxyForm.fields.proxyType.onChange,
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

// Deposits

sample({ clock: proxyDepositChanged, target: $newProxyDeposit });

sample({ clock: isProxyDepositLoadingChanged, target: $isProxyDepositLoading });

sample({ clock: multisigDepositChanged, target: $multisigDeposit });

sample({ clock: feeChanged, target: $fee });

sample({ clock: isFeeLoadingChanged, target: $isFeeLoading });

// Submit

sample({
  clock: $proxyForm.formValidated,
  source: {
    realAccount: $realAccount,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $newProxyDeposit,
    proxies: $activeProxies,
  },
  filter: ({ transaction }) => {
    return Boolean(transaction);
  },
  fn: ({ proxyDeposit, multisigDeposit, proxies, realAccount, transaction, isProxy, fee }, formData) => {
    const signatory = formData.signatory.accountId ? formData.signatory : undefined;
    const proxiedAddress = toAddress(formData.account.accountId, {
      prefix: formData.chain.addressPrefix,
    });
    const multisigDescription = `Add proxy for ${toShortAddress(proxiedAddress)}`; // TODO: update after i18n effector integration
    const description = signatory ? formData.description || multisigDescription : '';

    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...formData,
        fee,
        account: realAccount,
        signatory,
        description,
        proxyDeposit,
        multisigDeposit,
        proxyNumber: proxies.length,
        ...(isProxy && { proxiedAccount: formData.account as ProxiedAccount }),
      },
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
  $proxyWallet,

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
