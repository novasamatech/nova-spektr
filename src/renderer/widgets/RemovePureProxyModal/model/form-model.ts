import { createEvent, createStore, sample, combine, createEffect, restore } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { createForm } from 'effector-forms';
import { BN } from '@polkadot/util';
import { spread } from 'patronum';

import { Address, ProxyType, Account, PartialBy, Chain, ProxiedAccount } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { walletSelectModel } from '@features/wallets';
import { proxiesUtils } from '@features/proxies/lib/proxies-utils';
import { walletUtils, accountUtils, walletModel, permissionUtils } from '@entities/wallet';
import { proxyService } from '@shared/api/proxy';
import { TransactionType, Transaction, DESCRIPTION_LENGTH } from '@entities/transaction';
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
  signatory: Account;
  description: string;
};

type FormSubmitEvent = PartialBy<FormParams, 'signatory'>;
type Input = {
  chain?: Chain;
  account?: ProxiedAccount;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const feeChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $formStore = restore(formInitiated, null);

const $multisigDeposit = restore(multisigDepositChanged, '0');
const $fee = restore(feeChanged, '0');
const $isFeeLoading = restore(isFeeLoadingChanged, false);

const $proxyQuery = createStore<string>('');
const $activeProxies = createStore<ProxyAccounts['accounts']>([]);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $chain = $formStore.map((store) => (store ? store.chain : null), { skipVoid: false });
const $account = $formStore.map((store) => (store ? store.account : null), { skipVoid: false });

const $proxyForm = createForm<FormParams>({
  fields: {
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
            chain: $chain,
          }),
          validator: (value, form, { isMultisig, balances, chain, ...params }) => {
            if (!isMultisig) return true;

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              value.accountId,
              chain.chainId,
              chain.assets[0].assetId.toString(),
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
          validator: (value) => !value || value.length <= DESCRIPTION_LENGTH,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

// Options for selectors

const $proxyChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter(proxiesUtils.isRegularProxy);
});

const $proxiedAccounts = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
    chain: $chain,
    balances: balanceModel.$balances,
  },
  ({ wallet, accounts, chain, balances }) => {
    if (!wallet || !chain) return [];

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
    account: $account,
    chain: $chain,
    accounts: walletModel.$accounts,
    balances: balanceModel.$balances,
  },
  ({ wallet, wallets, account, accounts, chain, balances }) => {
    if (!wallet || !chain || !account || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<{ signer: Account; balance: string }[]>((acc, wallet) => {
      const walletAccounts = accountUtils.getWalletAccounts(wallet.id, accounts);
      const isAvailable = walletAccounts.length > 0 && permissionUtils.canCreateMultisigTx(wallet, walletAccounts);

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
    chain: $chain,
    query: $proxyQuery,
  },
  ({ wallets, accounts, chain, query }) => {
    if (!chain) return [];

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
    chain: $chain,
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
    chain: $chain,
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
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain?.chainId) return undefined;

    return apis[chain.chainId];
  },
  { skipVoid: false },
);

const $fakeTx = combine(
  {
    chain: $chain,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | undefined => {
    if (!chain || !isConnected) return undefined;

    return {
      chainId: chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
      type: TransactionType.REMOVE_PURE_PROXY,
      args: {
        spawner: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
        proxyType: ProxyType.ANY,
        index: 0,
        blockNumber: 1,
        extrinsicIndex: 1,
      },
    };
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: $proxyForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

type ProxyParams = {
  api: ApiPromise;
  address: Address;
};
const getAccountProxiesFx = createEffect(({ api, address }: ProxyParams): Promise<ProxyAccounts> => {
  return proxyService.getProxiesForAccount(api, address);
});

// Fields connections

sample({
  clock: formInitiated,
  fn: (formStore) => {
    return {
      ...formStore,
      signatory: undefined,
      description: '',
    };
  },
  target: formSubmitted,
});

sample({
  clock: formInitiated,
  target: [$proxyForm.reset, $proxyQuery.reinit],
});

sample({
  clock: $account,
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
  clock: $chain,
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
  clock: $chain,
  source: {
    apis: networkModel.$apis,
    account: $account,
    isChainConnected: $isChainConnected,
  },
  filter: ({ isChainConnected, account }, chain) => isChainConnected && Boolean(account) && Boolean(chain),
  fn: ({ apis, account }, chain) => ({
    api: apis[chain!.chainId],
    address: toAddress(account!.accountId, { prefix: chain!.addressPrefix }),
  }),
  target: getAccountProxiesFx,
});

sample({
  clock: getAccountProxiesFx.done,
  source: {
    chain: $chain,
    apis: networkModel.$apis,
  },
  filter: ({ chain, apis }, { params }) => {
    return !!chain && apis[chain.chainId].genesisHash === params.api.genesisHash;
  },
  fn: (_, { result }) => result.accounts,
  target: $activeProxies,
});

// Submit

sample({
  clock: $proxyForm.formValidated,
  source: {
    chain: $chain,
    account: $account,
  },
  filter: ({ chain, account }) => Boolean(chain) && Boolean(account),
  fn: ({ chain, account }, formData) => {
    const signatory = Object.keys(formData.signatory).length > 0 ? formData.signatory : undefined;
    const proxied = toAddress(account!.accountId, {
      prefix: chain!.addressPrefix,
    });
    const multisigDescription = `Remove pure proxy for ${proxied}`; // TODO: update after i18n effector integration
    const description = signatory ? formData.description || multisigDescription : '';

    return {
      ...formData,
      signatory,
      description,
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
