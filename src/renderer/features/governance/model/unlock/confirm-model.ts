import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import { type UnlockChunk } from '@shared/api/governance';
import {
  type Account,
  type Asset,
  type Chain,
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Wallet,
} from '@shared/core';
import { ZERO_BALANCE } from '@shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { UnlockRules } from '../../lib/unlock-rules';

type Input = {
  id?: number;
  chain: Chain;
  asset: Asset;
  unlockableClaims: UnlockChunk[];
  amount: string;
};

type BalanceMap = { balance: string; withdraw: string };

type FormParams = {
  shards: Account[];
  signatory: Account;
  amount: string;
  description: string;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $accountsBalances = createStore<BalanceMap[]>([]);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $confirmForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [] as Account[],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, fee }) => {
            if (!isProxy) return true;

            return new BN(fee).lte(new BN(proxyBalance));
          },
        },
      ],
    },
    signatory: {
      init: {} as Account,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: 'transfer.noSignatoryError',
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { fee, isMultisig, signatoryBalance, multisigDeposit }) => {
            if (!isMultisig) return true;

            return new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance));
          },
        },
      ],
    },
    amount: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'transfer.requiredAmountError',
          validator: Boolean,
        },
        {
          name: 'notZero',
          errorText: 'transfer.notZeroAmountError',
          validator: (value) => value !== ZERO_BALANCE,
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            fee: $fee,
            isMultisig: $isMultisig,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { fee, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            return form.shards.every((_: Account, index: number) => {
              return new BN(fee).lte(new BN(accountsBalances[index].balance));
            });
          },
        },
      ],
    },
    description: {
      init: '',
      rules: [UnlockRules.description.maxLength],
    },
  },
  validateOn: ['submit'],
});

// Computed
const $shards = combine(
  {
    activeWallet: walletModel.$activeWallet,
    network: $networkStore,
  },
  ({ activeWallet, network }) => {
    if (!network?.chain || !activeWallet) return [];

    return (
      activeWallet.accounts.filter((account, _, collection) => {
        const isBaseAccount = accountUtils.isBaseAccount(account);
        const isPolkadotVault = walletUtils.isPolkadotVault(activeWallet);
        const hasManyAccounts = collection.length > 1;

        if (isPolkadotVault && isBaseAccount && hasManyAccounts) {
          return false;
        }

        return accountUtils.isChainIdMatch(account, network.chain.chainId);
      }) || []
    );
  },
);

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    network: $networkStore,
    shards: $shards,
    // signatories: $selectedSignatories,
  },
  ({ wallet, wallets, network, shards }) => {
    if (!wallet || !network?.chain || shards.length !== 1) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0],
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: $shards,
  },
  ({ txWrappers, shards }) => {
    if (shards.length === 0) return [];
    if (txWrappers.length === 0) return shards;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return [(txWrappers[0] as MultisigTxWrapper).multisigAccount];
    }

    return [(txWrappers[0] as ProxyTxWrapper).proxyAccount];
  },
);

const $initiatorWallets = combine(
  {
    accounts: $realAccounts,
    wallets: walletModel.$wallets,
  },
  ({ accounts, wallets }) => {
    if (!accounts) return {};

    return accounts.reduce<Record<number, Wallet>>((acc, account, index) => {
      const wallet = walletUtils.getWalletById(wallets, account.walletId);
      if (!wallet) return acc;

      return {
        ...acc,
        [index]: wallet,
      };
    }, {});
  },
);

const $proxiedWallet = combine(
  {
    isProxy: $isProxy,
    shards: $shards,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, shards, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, shards[0].walletId);
  },
  { skipVoid: false },
);

// const $signerWallet = combine(
//   {
//     store: $confirmStore,
//     wallets: walletModel.$wallets,
//   },
//   ({ store, wallets }) => {
//     if (!store) return {};
//     // formData.signatory.accountId ? formData.signatory : undefined;
//     return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
//       const wallet = walletUtils.getWalletById(wallets, storeItem.signatory?.walletId || storeItem.account.walletId);
//       if (!wallet) return acc;

//       const id = storeItem.id ?? index;

//       return {
//         ...acc,
//         [id]: wallet,
//       };
//     }, {});
//   },
// );

const $isChainConnected = combine(
  {
    network: $networkStore,
    statuses: networkModel.$connectionStatuses,
  },
  ({ network, statuses }) => {
    if (!network) return false;

    return networkUtils.isConnectedStatus(statuses[network.chain.chainId]);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $pureTxs = combine(
  {
    network: $networkStore,
    form: $confirmForm.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (!network || !isConnected) return undefined;

    return form.shards.map((shard) => {
      return transactionBuilder.buildWithdraw({
        chain: network.chain,
        accountId: shard.accountId,
      });
    });
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTxs, txWrappers }) => {
    if (!networkStore || !pureTxs) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api: apis[networkStore.chain.chainId],
        addressPrefix: networkStore.chain.addressPrefix,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

sample({
  clock: formInitiated,
  target: $confirmForm.reset,
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  target: $confirmForm.fields.shards.onChange,
});

sample({
  clock: formInitiated,
  fn: ({ chain, asset }) => ({ chain, asset }),
  target: $networkStore,
});

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => ({
    isProxy: transactionService.hasProxy(txWrappers),
    isMultisig: transactionService.hasMultisig(txWrappers),
  }),
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
  }),
});

const $canSubmit = combine(
  {
    isFormValid: $confirmForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

export const confirmModel = {
  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,
  $initiatorWallets,
  $txWrappers,
  $confirmForm,
  $shards,
  $proxiedWallet,
  $realAccounts,
  $transactions,

  events: {
    formInitiated,
    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
