import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import {
  type Address,
  type Chain,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type ProxyType,
  type Transaction,
  TransactionType,
  type VaultBaseAccount,
  type Wallet,
} from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  dictionary,
  getNativeAsset,
  getProxyTypes,
  isStringsMatchQuery,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  validateAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { operationsUtils } from '@/entities/operations';
import { transactionService } from '@/entities/transaction';
import { accountUtils, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { proxiesUtils } from '@/features/proxies';

type ProxyAccounts = {
  accounts: {
    address: Address;
    proxyType: ProxyType;
  }[];
  deposit: string;
};

type FormParams = {
  chain: Chain;
  account: AnyAccount;
  signatory: AnyAccount | null;
  delegate: Address;
  proxyType: ProxyType;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    coreTx: Transaction;
  };
  formData: FormParams & {
    signatory: AnyAccount | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    multisigDeposit: string;
    proxyDeposit: string;
    proxyNumber: number;
  };
};

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = flow.state.map(({ wallet }) => wallet);

const $oldProxyDeposit = createStore<string>('0');

const $newProxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $proxyQuery = createStore<string>('');
const $maxProxies = createStore<number>(0);
const $activeProxies = createStore<ProxyAccounts['accounts']>([]);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    chain: {
      defaultValue: {} as Chain,
      validator: () => {
        return {
          source: combine({
            maxProxies: $maxProxies,
            proxies: $activeProxies,
          }),
          fn: (_v, _f, { maxProxies, proxies }) => {
            if (proxies.length > maxProxies) {
              return { message: 'proxy.addProxy.maxProxiesError' };
            }
          },
        };
      },
    },
    account: {
      defaultValue: {} as VaultBaseAccount,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          fn: (account, form, { isMultisig, balances, ...params }) => {
            const balance = balanceUtils.getBalance(
              balances,
              account.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId.toString(),
            );

            const isNotEnoughTokens = isMultisig
              ? new BN(params.proxyDeposit).gte(new BN(transferableAmount(balance)))
              : new BN(params.proxyDeposit).add(new BN(params.fee)).gte(new BN(transferableAmount(balance)));

            if (isNotEnoughTokens) {
              return { message: 'transfer.notEnoughBalanceForDepositError' };
            }
          },
        };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          fn: (signatory, form, { isMultisig, balances, ...params }) => {
            if (nullable(signatory)) {
              return { message: 'transfer.noSignatoryError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId.toString(),
            );

            const isNotEnoughMultisigTokens =
              isMultisig &&
              new BN(params.multisigDeposit).add(new BN(params.fee)).gte(withdrawableAmountBN(signatoryBalance));

            if (isNotEnoughMultisigTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    delegate: {
      defaultValue: '' as Address,
      validator: () => {
        return {
          source: $activeProxies,
          fn: (delegate, form, activeProxies: ProxyAccounts['accounts']) => {
            const isDelegateValid = validateAddress(delegate);
            if (!isDelegateValid) {
              return { message: 'proxy.addProxy.proxyAddressRequiredError' };
            }

            const isSameAsProxied =
              delegate === toAddress(form.account.accountId, { prefix: form.chain.addressPrefix });
            if (isSameAsProxied) {
              return { message: 'proxy.addProxy.sameAsProxiedError' };
            }

            const sameProxyExist = activeProxies.some((proxy) => {
              return proxy.proxyType === form.proxyType && proxy.address === delegate;
            });
            if (sameProxyExist) {
              return { message: 'proxy.addProxy.proxyTypeExistError' };
            }
          },
        };
      },
    },
    proxyType: {
      defaultValue: '' as ProxyType,
    },
  },
});

// Options for selectors

const $txWrappers = combine(
  {
    wallet: $wallet,
    wallets: walletModel.$wallets,
    account: form.fields.account.$value,
    chain: form.fields.chain.$value,
    signatory: form.fields.signatory.$value,
  },
  ({ wallet, account, chain, wallets, signatory }) => {
    if (!wallet || !chain || !account.id) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isVaultBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account,
      signatories: signatory ? [signatory] : [],
    });
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: form.fields.account.$value,
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

const $proxyChains = combine(
  {
    chains: networkModel.$chains,
    wallet: $wallet,
  },
  ({ chains, wallet }) => {
    if (!wallet) return [];

    const proxyChains = Object.values(chains).filter(proxiesUtils.isRegularProxy);
    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);

    return proxyChains.filter((chain) => {
      return wallet.accounts.some((account) => {
        if (isPolkadotVault && accountUtils.isVaultBaseAccount(account)) return false;

        return accountUtils.isChainAndCryptoMatch(account, chain);
      });
    });
  },
);

const $proxiedAccounts = combine(
  {
    wallet: $wallet,
    chain: form.fields.chain.$value,
    balances: balanceModel.$balances,
  },
  ({ wallet, chain, balances }) => {
    if (!wallet || !chain.chainId) return [];

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const walletAccounts = wallet.accounts.filter((account) => {
      if (isPolkadotVault && accountUtils.isVaultBaseAccount(account)) return false;

      return accountUtils.isChainAndCryptoMatch(account, chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(
        balances,
        account.accountId,
        chain.chainId,
        getNativeAsset(chain.assets).assetId.toString(),
      );

      return { account, balance: transferableAmount(balance) };
    });
  },
);

const $signatories = combine(
  {
    wallet: $wallet,
    wallets: walletModel.$wallets,
    account: form.fields.account.$value,
    chain: form.fields.chain.$value,
  },
  ({ wallet, wallets, account, chain }) => {
    if (!wallet || !chain.chainId || !account || !accountUtils.isMultisigAccount(account)) return [];

    const signers = dictionary(account.signatories, 'accountId', () => true);

    return wallets.reduce<AnyAccount[]>((acc, wallet) => {
      if (!permissionUtils.canCreateMultisigTx(wallet)) return acc;

      const signer = wallet.accounts.find((a) => {
        return signers[a.accountId] && accountUtils.isChainAndCryptoMatch(a, chain);
      });

      if (signer) {
        acc.push(signer);
      }

      return acc;
    }, []);
  },
);

const $proxyAccounts = combine(
  {
    wallets: walletModel.$wallets,
    chain: form.fields.chain.$value,
    query: $proxyQuery,
  },
  ({ wallets, chain, query }) => {
    if (!chain.chainId) return [];

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isVaultShardAccount(account);
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
    chain: form.fields.chain.$value,
  },
  ({ apis, statuses, chain }) => {
    if (!chain.chainId) return [];
    if (networkUtils.isConnectedStatus(statuses[chain.chainId])) {
      return getProxyTypes(apis[chain.chainId]);
    }

    return ['Any'] as const;
  },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: form.fields.chain.$value,
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
    form: form.$values,
  },
  ({ apis, form }) => {
    if (!form.chain.chainId) return null;

    return apis[form.chain.chainId] ?? null;
  },
);

const $coreTx = combine(
  {
    form: form.$values,
    account: $realAccount,
    isConnected: $isChainConnected,
  },
  ({ form, account, isConnected }): Transaction | null => {
    if (!isConnected || !account || !form.delegate || !form.proxyType) return null;

    return {
      chainId: form.chain.chainId,
      accountId: account.accountId,
      type: TransactionType.ADD_PROXY,
      args: {
        delegate: toAddress(form.delegate, { prefix: form.chain.addressPrefix }),
        proxyType: form.proxyType,
        delay: 0,
      },
    };
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.account.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
});

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
    isProxyDepositLoading: $isProxyDepositLoading,
  },
  ({ isFormValid, isFeeLoading, isProxyDepositLoading }) => {
    return isFormValid && !isFeeLoading && !isProxyDepositLoading;
  },
);

const $multisigAlreadyExists = combine(
  {
    apis: networkModel.$apis,
    coreTxs: $coreTx.map((tx) => (tx ? [tx] : [])),
    transactions: selectedWalletMultisigOperations.$list,
  },
  ({ apis, coreTxs, transactions }) => operationsUtils.isMultisigAlreadyExists({ apis, coreTxs, transactions }),
);

type ProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
};
const getAccountProxiesFx = createEffect(({ api, accountId }: ProxyParams): Promise<ProxyAccounts> => {
  return proxyService.getProxiesForAccount(api, accountId);
});

const getMaxProxiesFx = createEffect((api: ApiPromise): number => {
  return proxyService.getMaxProxies(api);
});

// Fields connections

sample({
  clock: formInitiated,
  target: [form.reset, $proxyQuery.reinit],
});

sample({
  clock: formInitiated,
  source: $proxyChains,
  fn: (chains) => chains[0],
  target: form.fields.chain.change,
});

sample({
  clock: proxyQueryChanged,
  target: $proxyQuery,
});

sample({
  clock: [form.fields.delegate.change, form.fields.proxyType.change],
  target: [form.fields.delegate.resetError, form.fields.proxyType.resetError],
});

sample({
  clock: form.fields.chain.change,
  target: [
    $proxyQuery.reinit,
    form.fields.chain.resetError,
    form.fields.account.resetError,
    form.fields.signatory.resetError,
    form.fields.delegate.reset,
  ],
});

sample({
  clock: form.fields.chain.change,
  source: $proxiedAccounts,
  filter: (proxiedAccounts) => proxiedAccounts.length > 0,
  fn: (proxiedAccounts) => proxiedAccounts[0].account,
  target: form.fields.account.change,
});

sample({
  clock: form.fields.account.change,
  source: {
    wallet: $wallet,
    wallets: walletModel.$wallets,
  },
  filter: (_, account) => Boolean(account),
  fn: ({ wallet, wallets }, account): Record<string, boolean> => {
    if (!wallet) return { isMultisig: false, isProxy: false };
    if (walletUtils.isMultisig(wallet)) return { isMultisig: true, isProxy: false };
    if (!walletUtils.isProxied(wallet)) return { isMultisig: false, isProxy: false };

    const accountWallet = walletUtils.getWalletById(wallets, account!.walletId);

    return {
      isMultisig: walletUtils.isRegularMultisig(accountWallet),
      isProxy: true,
    };
  },
  target: spread({
    isMultisig: $isMultisig,
    isProxy: $isProxy,
  }),
});

sample({
  clock: form.fields.chain.change,
  source: $proxyTypes,
  fn: (types) => types[0],
  target: form.fields.proxyType.change,
});

sample({
  clock: form.fields.chain.change,
  source: networkModel.$apis,
  filter: (_, chain) => Boolean(chain),
  fn: (apis, chain) => apis[chain!.chainId],
  target: getMaxProxiesFx,
});

sample({
  clock: getMaxProxiesFx.done,
  source: {
    chain: form.fields.chain.$value,
    apis: networkModel.$apis,
  },
  filter: ({ chain, apis }, { params }) => {
    return apis[chain.chainId].genesisHash === params.genesisHash;
  },
  fn: (_, { result }) => result,
  target: $maxProxies,
});

sample({
  clock: form.fields.chain.change,
  source: {
    apis: networkModel.$apis,
    account: form.fields.account.$value,
    isChainConnected: $isChainConnected,
  },
  filter: ({ isChainConnected, account }) => isChainConnected && Boolean(account),
  fn: ({ apis, account }, chain) => ({
    api: apis[chain.chainId],
    accountId: account.accountId,
  }),
  target: getAccountProxiesFx,
});

sample({
  clock: getAccountProxiesFx.done,
  source: {
    chain: form.fields.chain.$value,
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
  clock: form.submit.doneData,
  source: {
    realAccount: $realAccount,
    transaction: $tx,
    coreTx: $coreTx,
    isProxy: $isProxy,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $newProxyDeposit,
    proxies: $activeProxies,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ proxyDeposit, multisigDeposit, proxies, realAccount, transaction, coreTx, isProxy, fee }, formData) => {
    const signatory = formData.signatory?.accountId ? formData.signatory : null;

    return {
      transactions: {
        wrappedTx: transaction!,
        coreTx: coreTx!,
      },
      formData: {
        ...formData,
        fee: fee.toString(),
        account: realAccount,
        signatory,
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
  form,

  $wallet,
  $proxyChains,
  $proxiedAccounts,
  $signatories,
  $proxyAccounts,
  $proxyTypes,
  $proxyQuery,
  $proxyWallet,
  $txWrappers,

  $activeProxies,
  $oldProxyDeposit,
  $newProxyDeposit,
  $multisigDeposit,
  $fee,
  $pendingFee,
  $route,

  $api,
  $isMultisig,
  $isChainConnected,
  $canSubmit,
  $multisigAlreadyExists,

  flow,

  events: {
    formInitiated,
    proxyQueryChanged,
    proxyDepositChanged,
    multisigDepositChanged,
    isProxyDepositLoadingChanged,
  },

  output: {
    formSubmitted,
  },
};
