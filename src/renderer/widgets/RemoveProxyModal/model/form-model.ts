import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import {
  type Account,
  type Address,
  type Chain,
  type ProxiedAccount,
  ProxyType,
  type Transaction,
  TransactionType,
} from '@/shared/core';
import {
  TEST_ACCOUNTS,
  getProxyTypes,
  isStringsMatchQuery,
  nonNullable,
  toAddress,
  transferableAmount,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxiesUtils } from '@/features/proxies';
import { walletSelectModel } from '@/features/wallets';

type ProxyAccounts = {
  accounts: {
    address: Address;
    proxyType: ProxyType;
  }[];
  deposit: string;
};

type FormParams = {
  signatory: Account | null;
};

type Input = {
  chain?: Chain;
  account?: Account;
  proxiedAccount?: ProxiedAccount;
  signatories: {
    signer: Account;
    balance: string;
  }[];
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent<FormParams>();
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
const $realAccount = $formStore.map((store) => (store ? store.account : null), { skipVoid: false });
const $signatories = $formStore.map((store) => (store ? store.signatories : null), { skipVoid: false });

const $proxyForm = createForm<FormParams>({
  fields: {
    signatory: {
      init: null,
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
          validator: (signatory, form, { isMultisig, balances, chain, ...params }) => {
            if (!signatory || !isMultisig) return true;

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              chain.chainId,
              chain.assets[0].assetId.toString(),
            );

            return new BN(params.multisigDeposit).add(new BN(params.fee)).lte(withdrawableAmountBN(signatoryBalance));
          },
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
    chain: $chain,
    balances: balanceModel.$balances,
  },
  ({ wallet, chain, balances }) => {
    if (!wallet || !chain) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = wallet.accounts.filter((account) => {
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

const $proxyAccounts = combine(
  {
    wallets: walletModel.$wallets,
    chain: $chain,
    query: $proxyQuery,
  },
  ({ wallets, chain, query }) => {
    if (!chain) return [];

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isShardAccount(account);
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, chain);
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
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (!chain) return null;

    return apis[chain.chainId] ?? null;
  },
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
  target: [$proxyForm.reset, $proxyQuery.reinit],
});

sample({
  clock: $realAccount,
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
  clock: formInitiated,
  source: {
    isMultisig: $isMultisig,
  },
  filter: ({ isMultisig }) => Boolean(!isMultisig),
  fn: (formStore) => ({
    ...formStore,
    signatory: null,
  }),
  target: formSubmitted,
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
  filter: ({ chain, account }, formData) => {
    return nonNullable(chain) && nonNullable(account) && nonNullable(formData.signatory);
  },
  fn: (_, formData) => {
    const signatory = Object.keys(formData.signatory!).length > 0 ? formData.signatory : null;

    return { ...formData, signatory };
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
