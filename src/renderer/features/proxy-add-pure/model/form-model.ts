import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Chain, type ProxiedAccount, type Transaction, TransactionType, type Wallet } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getNativeAsset,
  nonNullable,
  transferableAmountBN,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { proxiesUtils } from '@/features/proxies';

type FormParams = {
  chain: Chain;
  initiator: AnyAccount;
  signatory: AnyAccount | null;
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
  };
};

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = flow.state.map(({ wallet }) => wallet);

const $proxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $proxyQuery = createStore<string>('');

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    chain: {
      defaultValue: {} as Chain,
    },
    initiator: {
      defaultValue: {} as AnyAccount,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            proxyDeposit: $proxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          fn: (value, form, { isMultisig, balances, fee, proxyDeposit }) => {
            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId.toString(),
            );
            const proxyDepositBN = new BN(proxyDeposit);
            const feeBN = new BN(fee);

            const hasEnoughTokens = isMultisig
              ? proxyDepositBN.lte(withdrawableAmountBN(balance))
              : proxyDepositBN.add(feeBN).lte(transferableAmountBN(balance));

            if (!hasEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughTokens' };
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
            proxyDeposit: $proxyDeposit,
            balances: balanceModel.$balances,
            isMultisig: $isMultisig,
          }),
          fn: (value, form, { isMultisig, balances, fee, multisigDeposit }) => {
            if (!value || !isMultisig) return;

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId.toString(),
            );

            const hasEnoughTokens = new BN(multisigDeposit)
              .add(new BN(fee))
              .lte(withdrawableAmountBN(signatoryBalance));

            if (!hasEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $walletAccounts = combine(
  {
    wallet: $wallet,
    accounts: accounts.$list,
  },
  ({ wallet, accounts }) => {
    if (!wallet) return [];

    return accountService.filterAccountsByWallet(accounts, wallet.id);
  },
);

const $availableChain = combine(
  {
    chains: networkModel.$chains,
    walletAccounts: $walletAccounts,
  },
  ({ chains, walletAccounts }) => {
    const proxyChains = Object.values(chains).filter(proxiesUtils.isPureProxy);

    return proxyChains.filter((chain) => {
      return walletAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain));
    });
  },
);

const $signatories = createSignatoriesStore({
  initiator: form.fields.initiator.$value,
  chain: form.fields.chain.$value,
  accounts: accounts.$list,
});

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

const $accounts = combine(
  {
    chain: form.fields.chain.$value,
    walletAccounts: $walletAccounts,
  },
  ({ chain, walletAccounts }) => {
    return walletAccounts.filter((account) => accountService.isAccountAvailableOnChain(account, chain));
  },
);

const $coreTx = combine(
  {
    form: form.$values,
    account: form.fields.initiator.$value,
    isConnected: $isChainConnected,
  },
  ({ form, account, isConnected }): Transaction | null => {
    if (!isConnected || !account) return null;

    return {
      chainId: form.chain.chainId,
      accountId: account.accountId,
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
});

const $isProxy = $route.map((route) => nonNullable(route.find((account) => accountUtils.isProxiedAccount(account))));
const $isMultisig = $route.map((route) =>
  nonNullable(route.find((account) => accountUtils.isMultisigAccount(account))),
);

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
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

sample({
  clock: formInitiated,
  target: [form.reset, $proxyQuery.reinit],
});

sample({
  clock: proxyQueryChanged,
  target: $proxyQuery,
});

sample({
  clock: form.fields.chain.change,
  target: [
    $proxyQuery.reinit,
    form.fields.chain.resetError,
    form.fields.initiator.resetError,
    form.fields.signatory.resetError,
  ],
});

//default initializers
sample({
  clock: formInitiated,
  source: $availableChain,
  filter: (chains) => chains.length > 0,
  fn: (chains) => chains.at(0)!,
  target: form.fields.chain.change,
});

sample({
  clock: form.fields.chain.change,
  source: $accounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => accounts.at(0)!,
  target: form.fields.initiator.change,
});

sample({
  clock: form.fields.initiator.change,
  source: $signatories,
  filter: (signatories) => signatories.length < 2,
  fn: (signatories) => signatories.at(0)!,
  target: form.fields.signatory.change,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    initiator: form.fields.initiator.$value,
    transaction: $tx,
    isProxy: $isProxy,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $proxyDeposit,
    coreTx: $coreTx,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ proxyDeposit, multisigDeposit, transaction, initiator, isProxy, fee, coreTx }, formData: FormParams) => {
    return {
      transactions: {
        wrappedTx: transaction!,
        coreTx: coreTx!,
      },
      formData: {
        ...formData,
        fee: fee.toString(),
        initiator,
        proxyDeposit,
        multisigDeposit: multisigDeposit.toString(),
        ...(isProxy && { proxiedAccount: formData.initiator as ProxiedAccount }),
      },
    } satisfies FormSubmitEvent;
  },
  target: formSubmitted,
});

export const formModel = {
  form,
  $wallet,
  $availableChain,
  $signatories,
  $proxyQuery,
  $tx,

  $coreTx,

  $proxyDeposit,
  $accounts,
  $fee,
  $pendingFee,
  $multisigDeposit,
  $pendingMultisigDeposit,
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
