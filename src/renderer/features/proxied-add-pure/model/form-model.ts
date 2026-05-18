import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ProxiedAccount, type Transaction, type Wallet, TransactionType } from '@/shared/core';
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
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { createDraftModeBinding } from '@/features/drafts';
import { addPureProxiedValidator } from '@/features/operations/OperationsValidation';
import { proxiesUtils } from '@/features/proxies';
import { createSigningPathModel } from '@/features/signing-path';

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
    signingPath: PathNode[];
  };
};

const flowStarted = createEvent<Wallet>();

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyQueryChanged = createEvent<string>();

const draftMode = createDraftModeBinding({ formInitiated, chainChanged: formInitiated });

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
            isMultisig: $isMultisig,
          }),
          fn: (value, form, { isMultisig, balances, fee, proxyDeposit }) => {
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
            balances: balanceModel.$balanceMap,
            isMultisig: $isMultisig,
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (value, form, { isMultisig, balances, fee, multisigDeposit, isDraftMode }) => {
            if (isDraftMode) return;
            if (!isMultisig) return;

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
    const filteredChains = proxyChains.filter(chain => {
      return walletAccounts.some(account => accountService.isAccountAvailableOnChain(account, chain));
    });
    return chainsService.sortChains(filteredChains);
  },
);

const $signatories = createSignatoriesStore({
  initiator: form.fields.initiator.$value,
  chain: form.fields.chain.$value,
  accounts: accounts.$list,
});

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: form.fields.initiator.$value,
    chain: form.fields.chain.$value,
    resetOn: formInitiated,
    resetUserOverrideOn: form.fields.initiator.change,
  },
);

const $isChainConnected = combine(
  {
    chain: form.fields.chain.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain || !chain.chainId) return false;

    const status = statuses[chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
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
  routeOverride: $pathRoute,
});

// Transaction validation
const $asset = form.fields.chain.$value.map(chain => (chain ? getNativeAsset(chain.assets) : null));
const { $errors, $valid } = createTxValidationStore({
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
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $draftCoreTx = combine(
  {
    chain: form.fields.chain.$value,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ chain, path, isPathComplete }): Transaction | null => {
    if (!chain || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    return {
      chainId: chain.chainId,
      accountId: sourceAccountId,
      type: TransactionType.CREATE_PURE_PROXY,
      args: { proxyType: 'Any', delay: 0, index: 0 },
    };
  },
);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $draftNetworkStore = combine(form.fields.chain.$value, chain =>
  chain ? { chain, asset: getNativeAsset(chain.assets) } : null,
);

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isFormValid: form.$isValid,
    isValid: $valid,
    isFeeLoading: $pendingFee,
    isProxyDepositLoading: $isProxyDepositLoading,
  },
  ({ isDraftMode, isValid, isFormValid, isFeeLoading, isProxyDepositLoading }) => {
    if (isDraftMode) return false;
    return isValid && isFormValid && !isFeeLoading && !isProxyDepositLoading;
  },
);

const $canSaveAsDraft = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    networkStore: $draftNetworkStore,
  },
  ({ isDraftMode, isPathComplete, callData, networkStore }) => {
    if (!isDraftMode || !isPathComplete || !callData || !networkStore) return false;
    return true;
  },
);

draftMode.connectSave({
  source: 'proxied-add-pure-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore: $draftNetworkStore,
  $canSave: $canSaveAsDraft,
});

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
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

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
    signingPath: $signingPath,
  },
  filter: ({ transaction, fee }) => nonNullable(transaction) && nonNullable(fee),
  fn: (
    { proxyDeposit, multisigDeposit, transaction, initiator, isProxy, fee, coreTx, signingPath },
    formData: FormParams,
  ) => {
    return {
      transactions: {
        wrappedTx: transaction!,
        coreTx: coreTx!,
      },
      formData: {
        ...formData,
        fee: fee!.toString(),
        initiator,
        proxyDeposit,
        multisigDeposit: multisigDeposit.toString(),
        signingPath,
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
  $signingPath,
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
  signingPathChanged,

  formSubmitted,
  $errors,

  $isDraftMode: draftMode.$isDraftMode,
  $canSaveAsDraft,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
};
