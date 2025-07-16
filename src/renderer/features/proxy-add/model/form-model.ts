import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import {
  type Address,
  type Chain,
  type ProxyType,
  type Transaction,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
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
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
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
  initiator: AnyAccount | null;
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
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = flow.state.map(({ wallet }) => wallet);

const $oldProxyDeposit = createStore<string>('0');

const $newProxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $proxyQuery = createStore<string>('');
const $maxProxies = createStore<number>(0);
const $activeProxies = createStore<ProxyAccounts['accounts']>([]);

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
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            proxyDeposit: $newProxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          fn: (initiator, form, { isMultisig, balances, ...params }) => {
            if (nullable(initiator)) {
              return { message: 'transfer.noInitiatorError' };
            }

            const balance = balanceUtils.getBalance(
              balances,
              initiator.accountId,
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
              delegate === toAddress(form.initiator?.accountId ?? '', { prefix: form.chain.addressPrefix });
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

const $availableChains = combine(
  {
    chains: networkModel.$chains,
    walletAccounts: walletSelect.$selectedAccounts,
  },
  ({ chains, walletAccounts }) => {
    const proxyChains = Object.values(chains).filter(proxiesUtils.isRegularProxy);

    return proxyChains.filter((chain) => {
      return walletAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain));
    });
  },
);

const $signatories = createSignatoriesStore({
  chain: form.fields.chain.$value,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $avilableAccounts = combine(
  {
    chain: form.fields.chain.$value,
    walletAccounts: walletSelect.$selectedAccounts,
  },
  ({ chain, walletAccounts }) => {
    return walletAccounts.filter((account) => accountService.isAccountAvailableOnChain(account, chain));
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

// const $fakeTx = combine(
//   {
//     chain: form.fields.chain.$value,
//     isConnected: $isChainConnected,
//   },
//   ({ isConnected, chain }): Transaction | null => {
//     if (!chain.chainId || !isConnected) return null;

//     return {
//       chainId: chain.chainId,
//       accountId: TEST_ACCOUNTS[0],
//       type: TransactionType.ADD_PROXY,
//       args: {
//         delegate: toAddress(TEST_ACCOUNTS[0], { prefix: chain.addressPrefix }),
//         proxyType: 'Any',
//         delay: 0,
//       },
//     };
//   },
// );

const $coreTx = combine(
  {
    form: form.$values,
    account: form.fields.initiator.$value,
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
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
  // TODO fakeTx: $fakeTx,
});

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isMultisigAccount(acc));
});

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit, $pending: _pendingDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
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
  source: $availableChains,
  fn: (chains) => chains[0],
  target: form.fields.chain.change,
});

sample({
  source: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
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
    form.fields.initiator.resetError,
    form.fields.signatory.resetError,
    form.fields.delegate.reset,
  ],
});

sample({
  source: $avilableAccounts,
  filter: (avilableAccounts) => avilableAccounts.length > 0,
  fn: (avilableAccounts) => avilableAccounts[0],
  target: form.fields.initiator.change,
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
  filter: (_, chain) => nonNullable(chain),
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
    account: form.fields.initiator.$value,
    isChainConnected: $isChainConnected,
  },
  filter: ({ isChainConnected, account }) => isChainConnected && nonNullable(account),
  fn: ({ apis, account }, chain) => ({
    api: apis[chain.chainId],
    accountId: account!.accountId,
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
    transaction: $tx,
    coreTx: $coreTx,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $newProxyDeposit,
    proxies: $activeProxies,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ proxyDeposit, multisigDeposit, proxies, transaction, coreTx, fee }, formData) => {
    const signatory = formData.signatory?.accountId ? formData.signatory : null;

    return {
      transactions: {
        wrappedTx: transaction!,
        coreTx: coreTx!,
      },
      formData: {
        ...formData,
        fee: fee.toString(),
        signatory,
        proxyDeposit,
        multisigDeposit: multisigDeposit.toString(),
        proxyNumber: proxies.length,
      },
    };
  },
  target: formSubmitted,
});

export const formModel = {
  form,

  $wallet,
  $availableChains,
  $avilableAccounts,
  $signatories,
  $proxyAccounts,
  $proxyTypes,
  $proxyQuery,

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

  flow,

  formInitiated,
  proxyQueryChanged,
  proxyDepositChanged,
  isProxyDepositLoadingChanged,
  formSubmitted,
};
