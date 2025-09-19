import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type Chain, type ProxiedAccount, type Transaction, TransactionType, type Wallet } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getNativeAsset,
  nonNullable,
  transferableAmountBN,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { addPureProxiedValidator } from '@/features/operations/OperationsValidation';
import { proxiesUtils } from '@/features/proxies';

type FormParams = {
  chain: Chain | null;
  initiator: AnyAccount | null;
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

const flowStarted = createEvent<Wallet>();

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const proxyDepositChanged = createEvent<string>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = restore(flowStarted, null);

const $proxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $proxyQuery = createStore<string>('');

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    chain: {
      defaultValue: null,
    },
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            proxyDeposit: $proxyDeposit,
            balances: balanceModel.$balanceMap,
            isAnyMultisigAccount: $isMultisig,
          }),
          fn: (value, form, { isAnyMultisigAccount, balances, fee, proxyDeposit }) => {
            if (!value) {
              return { message: 'proxy.addProxy.noInitiator' };
            }

            if (!form.chain) {
              return { message: 'proxy.addProxy.noChain' };
            }

            const balance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId,
            );
            const proxyDepositBN = new BN(proxyDeposit);
            const feeBN = new BN(fee);

            const hasEnoughTokens = isAnyMultisigAccount
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
            balances: balanceModel.$balanceMap,
            isAnyMultisigAccount: $isMultisig,
          }),
          fn: (value, form, { isAnyMultisigAccount, balances, fee, multisigDeposit }) => {
            if (!isAnyMultisigAccount) return;

            if (!value) {
              return { message: 'proxy.addProxy.noSignatoryError' };
            }

            if (!form.chain) {
              return { message: 'proxy.addProxy.noChainError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              value.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId,
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

const $availableChains = combine(
  {
    chains: networkModel.$chains,
    walletAccounts: $walletAccounts,
  },
  ({ chains, walletAccounts }) => {
    const proxyChains = Object.values(chains).filter(proxiesUtils.isPureProxy);

    return proxyChains.filter(chain => {
      return walletAccounts.some(account => accountService.isAccountAvailableOnChain(account, chain));
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
    if (!chain || !chain.chainId) return false;

    return networkUtils.isConnectedStatus(statuses[chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    form: form.$values,
  },
  ({ apis, form }) => {
    if (!form.chain || !form.chain.chainId) return null;

    return apis[form.chain.chainId] ?? null;
  },
);

const $coreTx = combine(
  {
    form: form.$values,
    signatory: form.fields.signatory.$value,
    isConnected: $isChainConnected,
  },
  ({ form, signatory, isConnected }): Transaction | null => {
    if (!isConnected || !signatory || !form.chain) return null;

    return {
      chainId: form.chain.chainId,
      accountId: signatory.accountId,
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

// Transaction validation
const $asset = form.fields.chain.$value.map(chain => (chain ? getNativeAsset(chain.assets) : null));
const { $errors } = createTxValidationStore({
  validator: addPureProxiedValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $isProxy = $route.map(route => route.some(account => accountUtils.isProxiedAccount(account)));
const $isMultisig = $route.map(route => route.some(account => accountUtils.isAnyMultisigAccount(account)));

const $multisigThreshold = $route.map(route => {
  const anyMultisig = route.find(accountUtils.isAnyMultisigAccount);
  if (!anyMultisig) return null;

  return anyMultisig.threshold;
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
  source: $availableChains,
  filter: chains => chains.length > 0,
  fn: chains => chains.at(0)!,
  target: form.fields.chain.change,
});

const $accounts = createInitiatorsStore({
  chain: form.fields.chain.$value,
  accounts: $walletAccounts,
});

sample({
  clock: form.fields.chain.change,
  source: $accounts,
  filter: accounts => accounts.length > 0,
  fn: accounts => accounts.at(0)!,
  target: form.fields.initiator.change,
});

sample({
  clock: form.fields.initiator.change,
  source: $signatories,
  filter: signatories => signatories.length < 2,
  fn: signatories => signatories.at(0)!,
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
  $availableChains,
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

  flowStarted,

  formInitiated,
  proxyQueryChanged,
  proxyDepositChanged,
  isProxyDepositLoadingChanged,

  formSubmitted,
  $errors,
};
