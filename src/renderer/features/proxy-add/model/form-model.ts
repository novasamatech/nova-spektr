import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { and, not } from 'patronum';

import { chainsService } from '@/shared/api/network';
import { proxyService } from '@/shared/api/proxy';
import { type Chain, type ProxyType, type Transaction, type Wallet, ProxyTypes } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import {
  TEST_ACCOUNTS,
  ZERO_BALANCE,
  getNativeAsset,
  getProxyTypes,
  nonNullable,
  nullable,
  toAccountId,
  toAddress,
  transferableAmount,
  validateAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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
import { proxyModel } from '@/entities/proxy';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { addProxyValidator } from '@/features/operations/OperationsValidation';
import { proxiesUtils } from '@/features/proxies';
import { graphModel } from '@/features/signing-path';

type ProxyAccounts = {
  accounts: {
    accountId: AccountId;
    proxyType: ProxyType;
  }[];
  deposit: string;
};

type FormParams = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  delegate: string;
  proxyType: ProxyType;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    coreTx: Transaction;
  };
  formData: {
    chain: Chain;
    initiator: AnyAccount;
    signatory: AnyAccount;
    delegate: AccountId;
    proxyType: ProxyType;
    fee: string;
    multisigDeposit: string;
    proxyDeposit: string;
    proxyNumber: number;
  };
};
const flowStarted = createEvent<Wallet>();

const formInitiated = createEvent();
const formSubmitted = createEvent<FormSubmitEvent>();
const proxyDepositChanged = createEvent<string>();
const isProxyDepositLoadingChanged = createEvent<boolean>();

const $wallet = restore(flowStarted, null);

const $newProxyDeposit = restore(proxyDepositChanged, ZERO_BALANCE);
const $isProxyDepositLoading = restore(isProxyDepositLoadingChanged, true);

const $maxProxies = createStore<number>(0);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    chain: {
      defaultValue: null,
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
            balances: balanceModel.$balanceMap,
            isMultisig: $isMultisig,
          }),
          fn: (initiator, form, { isMultisig, balances, ...params }) => {
            if (nullable(initiator)) {
              return { message: 'proxy.addProxy.noInitiatorError' };
            }

            if (nullable(form.chain)) {
              return { message: 'proxy.addProxy.noChainError' };
            }

            const balance = balanceUtils.getBalance(
              balances,
              initiator.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId,
            );

            const isNotEnoughTokens = isMultisig
              ? new BN(params.proxyDeposit).gte(new BN(transferableAmount(balance)))
              : new BN(params.proxyDeposit).add(new BN(params.fee)).gte(new BN(transferableAmount(balance)));

            if (isNotEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughBalanceForDepositError' };
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
            balances: balanceModel.$balanceMap,
            isMultisig: $isMultisig,
          }),
          fn: (signatory, form, { isMultisig, balances, ...params }) => {
            if (nullable(signatory)) {
              return { message: 'proxy.addProxy.noSignatoryError' };
            }

            if (nullable(form.chain)) {
              return { message: 'proxy.addProxy.noChainError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              form.chain.chainId,
              getNativeAsset(form.chain.assets).assetId,
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
      defaultValue: '',
      validator: () => {
        return {
          source: $activeProxies,
          fn: (delegate, form, activeProxies: ProxyAccounts['accounts']) => {
            const isDelegateValid = validateAddress(delegate);
            if (!isDelegateValid) {
              return { message: 'proxy.addProxy.proxyAddressRequiredError' };
            }

            if (nullable(form.chain)) {
              return { message: 'proxy.addProxy.noChainError' };
            }

            const isSameAsProxied =
              delegate === toAddress(form.initiator?.accountId ?? '', { prefix: form.chain.addressPrefix });
            if (isSameAsProxied) {
              return { message: 'proxy.addProxy.sameAsProxiedError' };
            }

            const sameProxyExist = activeProxies.some((proxy) => {
              return proxy.proxyType === form.proxyType && proxy.accountId === toAccountId(delegate);
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

// Options for selectors

const $availableChains = combine(
  {
    chains: networkModel.$chains,
    walletAccounts: $walletAccounts,
  },
  ({ chains, walletAccounts }) => {
    const proxyChains = Object.values(chains).filter(proxiesUtils.isRegularProxy);
    const filteredChains = proxyChains.filter((chain) => {
      return walletAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain));
    });
    return chainsService.sortChains(filteredChains);
  },
);

const $signatories = createSignatoriesStore({
  chain: form.fields.chain.$value,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

// signing path

const signingPathChanged = createEvent<PathNode[]>();
const $signingPath = createStore<PathNode[]>([])
  .on(signingPathChanged, (_, path) => path)
  .reset(formInitiated);

const $userOverrodePath = createStore(false)
  .on(signingPathChanged, () => true)
  .reset(formInitiated, form.fields.initiator.change);

const $chainIdForPath = form.fields.chain.$value.map((c) => c?.chainId ?? null);
const $defaultSigningPath = graphModel.$defaultPathFor(form.fields.initiator.$value, $chainIdForPath);

sample({
  clock: $defaultSigningPath,
  source: $userOverrodePath,
  filter: (userOverrode) => !userOverrode,
  fn: (_, defaultPath) => defaultPath,
  target: $signingPath,
});

const $signatoryFromPath = combine(
  { path: $signingPath, allAccounts: accounts.$list, chain: form.fields.chain.$value },
  ({ path, allAccounts, chain }): AnyAccount | null => {
    if (nullable(chain)) return null;
    const last = path.at(-1);
    if (!last || last.kind !== 'signer') return null;
    return (
      allAccounts.find((a) => a.accountId === last.accountId && accountService.isAccountAvailableOnChain(a, chain)) ??
      null
    );
  },
);

const $availableAccounts = createInitiatorsStore({
  chain: form.fields.chain.$value,
  accounts: $walletAccounts,
});

const $proxyAccounts = combine(
  {
    wallets: walletModel.$wallets,
    chain: form.fields.chain.$value,
  },
  ({ wallets, chain }) => {
    if (!chain?.chainId) return [];

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isVaultShardAccount(account);
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, chain);

      return isChainAndCryptoMatch && !isShardAccount;
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
    if (!chain?.chainId) return [];

    const status = statuses[chain.chainId];
    if (status && networkUtils.isConnectedStatus(status)) {
      return getProxyTypes(apis[chain.chainId]!);
    }

    return [ProxyTypes.ANY];
  },
);

// Miscellaneous

const $isChainConnected = combine(
  {
    chain: form.fields.chain.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain?.chainId) return false;

    const status = statuses[chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: form.fields.chain.$value,
  },
  ({ apis, chain }) => {
    if (!chain?.chainId) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $fakeTx = combine(
  {
    chain: form.fields.chain.$value,
    isConnected: $isChainConnected,
  },
  ({ isConnected, chain }): Transaction | null => {
    if (!chain || !isConnected) return null;

    return transactionBuilder.buildAddProxy({
      chain: chain,
      accountId: TEST_ACCOUNTS[0],
      delegateAccountId: TEST_ACCOUNTS[0],
      type: ProxyTypes.ANY,
    });
  },
);

const $coreTx = combine(
  {
    form: form.$values,
    signatory: form.fields.signatory.$value,
    isConnected: $isChainConnected,
  },
  ({ form, signatory, isConnected }): Transaction | null => {
    if (!isConnected || !signatory || !form.delegate || !form.proxyType || !form.chain) return null;

    return transactionBuilder.buildAddProxy({
      chain: form.chain,
      accountId: signatory.accountId,
      delegateAccountId: toAccountId(form.delegate),
      type: form.proxyType,
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
  feeTransaction: $fakeTx,
});

// Transaction validation
type ProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
};

const { $: $proxiesInfo } = createStoreFromEffect({
  fn: ({ api, accountId }: ProxyParams) => {
    return proxyService.getProxiesForAccount(api, accountId);
  },
  params: {
    api: $api,
    accountId: form.fields.initiator.$value.map((account) => account?.accountId ?? null),
  },
  defaultValue: null,
});

const $activeProxies = $proxiesInfo.map((info) => info?.accounts ?? []);
const $oldProxyDeposit = $proxiesInfo.map((info) => info?.deposit ?? '0');

const $asset = form.fields.chain.$value.map((chain) => (chain ? getNativeAsset(chain.assets) : null));
const { $errors, $valid } = createTxValidationStore({
  validator: addProxyValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
    proxyNumber: $activeProxies.map((proxies) => proxies.length),
    deposit: $oldProxyDeposit,
  },
});

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isAnyMultisigAccount(acc));
});

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $canSubmit = and($valid, form.$isValid, not($pendingFee), not($isProxyDepositLoading));

const getMaxProxiesFx = createEffect((api: ApiPromise): number => {
  return proxyService.getMaxProxies(api);
});

// Fields connections

sample({
  clock: flowStarted,
  target: formInitiated,
});

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  source: $availableChains,
  fn: (chains) => chains[0] ?? null,
  target: form.fields.chain.change,
});

sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

// Dropdown → path sync.
sample({
  clock: form.fields.signatory.$value,
  source: {
    initiator: form.fields.initiator.$value,
    chain: form.fields.chain.$value,
    currentPath: $signingPath,
    multisigByAccountId: graphModel.$multisigByAccountId,
    proxies: proxyModel.$proxies,
    ownSignerAccountIds: graphModel.$ownSignerAccountIds,
    resolveName: graphModel.$nameResolver,
  },
  filter: ({ initiator, chain, currentPath }, signatory) => {
    if (!initiator || !chain || !signatory) return false;
    const last = currentPath.at(-1);
    if (last && last.kind === 'signer' && last.accountId === signatory.accountId) return false;
    return accountUtils.isAnyMultisigAccount(initiator) || accountUtils.isProxiedAccount(initiator);
  },
  fn: ({ initiator, chain, multisigByAccountId, proxies, ownSignerAccountIds, resolveName }, signatory): PathNode[] => {
    return graphModel.pickDefaultPath({
      initiator: initiator!,
      chainId: chain!.chainId,
      multisigByAccountId,
      proxies,
      ownSignerAccountIds,
      resolveName,
      targetSigner: signatory!.accountId,
    });
  },
  target: signingPathChanged,
});

sample({
  clock: [form.fields.delegate.change, form.fields.proxyType.change],
  target: [form.fields.delegate.resetError, form.fields.proxyType.resetError],
});

sample({
  clock: form.fields.chain.change,
  target: [
    form.fields.chain.resetError,
    form.fields.initiator.resetError,
    form.fields.signatory.resetError,
    form.fields.delegate.reset,
  ],
});

sample({
  source: $availableAccounts,
  filter: (avilableAccounts) => avilableAccounts.length > 0,
  fn: (avilableAccounts) => avilableAccounts[0]!,
  target: form.fields.initiator.change,
});

sample({
  clock: form.fields.chain.change,
  source: $proxyTypes,
  filter: (types) => types.length > 0,
  fn: (types) => types[0]!,
  target: form.fields.proxyType.change,
});

sample({
  clock: form.fields.chain.change,
  source: networkModel.$apis,
  filter: (_, chain) => nonNullable(chain),
  fn: (apis, chain) => apis[chain!.chainId]!,
  target: getMaxProxiesFx,
});

sample({
  clock: getMaxProxiesFx.done,
  source: {
    chain: form.fields.chain.$value,
    apis: networkModel.$apis,
  },
  filter: ({ chain, apis }, { params }) => {
    return nonNullable(chain) && apis[chain?.chainId]?.genesisHash === params.genesisHash;
  },
  fn: (_, { result }) => result,
  target: $maxProxies,
});

// Submit

const submitCompleted = sample({
  clock: form.submit.doneData,
  source: {
    transaction: $tx,
    coreTx: $coreTx,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $newProxyDeposit,
    proxies: $activeProxies,
  },
  fn: ({ proxyDeposit, multisigDeposit, proxies, transaction, coreTx, fee }, formData): FormSubmitEvent | null => {
    const delegate = formData.delegate;

    if (!validateAddress(delegate)) return null;
    if (nullable(formData.initiator) || nullable(formData.signatory) || nullable(formData.chain) || nullable(fee)) {
      return null;
    }

    return {
      transactions: {
        wrappedTx: transaction!,
        coreTx: coreTx!,
      },
      formData: {
        chain: formData.chain,
        initiator: formData.initiator,
        proxyType: formData.proxyType,
        fee: fee.toString(),
        delegate: toAccountId(delegate),
        signatory: formData.signatory,
        proxyDeposit,
        multisigDeposit: multisigDeposit.toString(),
        proxyNumber: proxies.length,
      },
    };
  },
});

sample({
  clock: submitCompleted.filter({ fn: nonNullable }),
  target: formSubmitted,
});

export const formModel = {
  form,

  $wallet,
  $availableChains,
  $availableAccounts,
  $signatories,
  $signingPath,
  $proxyAccounts,
  $proxyTypes,

  $activeProxies,
  $oldProxyDeposit,
  $newProxyDeposit,
  $multisigDeposit,
  $fee,
  $pendingFee,
  $route,

  flowStarted,
  $coreTx,
  $api,
  $isMultisig,
  $isChainConnected,
  $canSubmit,

  formInitiated,
  proxyDepositChanged,
  isProxyDepositLoadingChanged,
  signingPathChanged,
  formSubmitted,
  $errors,
};
