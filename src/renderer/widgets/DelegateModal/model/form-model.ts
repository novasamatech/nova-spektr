import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import { type Account, type Asset, type Chain, type Conviction } from '@/shared/core';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  toAddress,
  transferableAmount,
  transferableAmountBN,
  withdrawableAmount,
} from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { getLocksForAddress } from '@/features/governance/utils/getLocksForAddress';
import { type WalletData } from '../lib/types';

type FormParams = {
  shards: Account[];
  signatory: Account | null;
  amount: string;
  conviction: Conviction;
  locks: Record<string, BN>;
};

const formInitiated = createEvent<WalletData & { shards: Account[] }>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const txWrapperChanged = createEvent<{
  proxyAccount: Account | null;
  signatories: Account[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();
const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $shards = createStore<Account[]>([]);

const $delegateBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $availableSignatories = createStore<Account[][]>([]);
const $proxyAccount = createStore<Account | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $feeData = restore(feeDataChanged, {
  fee: ZERO_BALANCE,
  totalFee: ZERO_BALANCE,
  multisigDeposit: ZERO_BALANCE,
});

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    shards: $shards,
    balances: balanceModel.$balances,
    trackLocks: locksAggregate.$trackLocks,
  },
  ({ network, wallet, shards, balances, trackLocks }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId.toString());
      const address = toAddress(shard.accountId, { prefix: network!.chain.addressPrefix });
      const lock = getLocksForAddress(address, trackLocks);

      return {
        account: shard,
        balance: transferableAmountBN(balance),
        lock,
        available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
      };
    });
  },
);

const $accountsBalances = $accounts.map((accounts) => {
  return accounts.map(({ available }) => available.toString());
});

const $delegateForm = createForm<FormParams>({
  fields: {
    shards: {
      init: [],
      rules: [
        {
          name: 'noProxyFee',
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          validator: (_s, _f, { isProxy, proxyBalance, feeData }) => {
            if (!isProxy) return true;

            return new BN(feeData.fee).lte(new BN(proxyBalance));
          },
        },
        {
          name: 'noBondBalance',
          errorText: 'staking.bond.noBondBalanceError',
          source: combine({
            isProxy: $isProxy,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (shards, form, { isProxy, network, accountsBalances }) => {
            if (isProxy || shards.length === 1) return true;

            const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

            return shards.every((_, index) => amountBN.lte(new BN(accountsBalances[index])));
          },
        },
      ],
    },
    signatory: {
      init: null,
      rules: [
        {
          name: 'noSignatorySelected',
          errorText: 'transfer.noSignatoryError',
          source: $isMultisig,
          validator: (signatory, _, isMultisig) => {
            if (!signatory || !isMultisig) return true;

            return Object.keys(signatory).length > 0;
          },
        },
        {
          name: 'notEnoughTokens',
          errorText: 'proxy.addProxy.notEnoughMultisigTokens',
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          validator: (_s, _f, { feeData, isMultisig, signatoryBalance }) => {
            if (!isMultisig) return true;

            return new BN(feeData.multisigDeposit).add(new BN(feeData.fee)).lte(new BN(signatoryBalance));
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
          name: 'notEnoughBalance',
          errorText: 'staking.notEnoughBalanceError',
          source: combine({
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
          }),
          validator: (value, _, { network, delegateBalanceRange }) => {
            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const delegateBalance = Array.isArray(delegateBalanceRange)
              ? delegateBalanceRange[1]
              : delegateBalanceRange;

            return amountBN.lte(new BN(delegateBalance));
          },
        },
        {
          name: 'insufficientBalanceForFee',
          errorText: 'transfer.notEnoughBalanceForFeeError',
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            network: $networkStore,
            accountsBalances: $accountsBalances,
          }),
          validator: (value, form, { network, feeData, isMultisig, accountsBalances }) => {
            if (isMultisig) return true;

            const feeBN = new BN(feeData.fee);
            const amountBN = new BN(formatAmount(value, network.asset.precision));

            return form.shards.every((_: Account, index: number) => {
              return amountBN.add(feeBN).lte(new BN(accountsBalances[index]));
            });
          },
        },
      ],
    },
    conviction: {
      init: 'Locked1x',
      rules: [],
    },
    locks: {
      init: {},
      rules: [],
    },
  },
  validateOn: ['submit'],
});

// Computed

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $signatories = combine(
  {
    network: $networkStore,
    availableSignatories: $availableSignatories,
    balances: balanceModel.$balances,
  },
  ({ network, availableSignatories, balances }) => {
    if (!network) return [];

    const { chain, asset } = network;

    return availableSignatories.reduce<{ signer: Account; balance: string }[][]>((acc, signatories) => {
      const balancedSignatories = signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        return { signer: signatory, balance: withdrawableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
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

const $canSubmit = combine(
  {
    isFormValid: $delegateForm.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: $delegateForm.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => Boolean(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    shards,
  }),
  target: spread({
    shards: $shards,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  fn: (shards) => shards,
  target: $delegateForm.fields.shards.onChange,
});

sample({
  clock: txWrapperChanged,
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    signatories: $availableSignatories,
    proxyAccount: $proxyAccount,
  }),
});

sample({
  source: $accountsBalances,
  fn: (accountsBalances) => {
    if (accountsBalances.length === 0) return ZERO_BALANCE;

    const minBondBalance = accountsBalances.reduce<string>((acc, balance) => {
      if (!balance) return acc;

      return new BN(balance).lt(new BN(acc)) ? balance : acc;
    }, accountsBalances[0]);

    return minBondBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, minBondBalance];
  },
  target: $delegateBalanceRange,
});

sample({
  clock: $delegateForm.fields.signatory.onChange,
  source: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories, signatory) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: $delegateForm.fields.shards.onChange,
  target: $delegateForm.fields.amount.resetErrors,
});

sample({
  clock: $delegateForm.fields.amount.onChange,
  target: $delegateForm.fields.shards.resetErrors,
});

sample({
  source: {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  filter: ({ isProxy, network, proxyAccount }) => {
    return isProxy && Boolean(network) && Boolean(proxyAccount);
  },
  fn: ({ balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount!.accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: $delegateForm.$values.updates,
  source: { networkStore: $networkStore, accounts: $accounts },
  filter: (networkStore) => nonNullable(networkStore),
  fn: ({ accounts }, formData) => {
    const locks = accounts.reduce((acc, val) => ({ ...acc, [val.account.accountId]: val.lock }), {});

    return { ...formData, locks };
  },
  target: formChanged,
});

sample({
  clock: $delegateForm.formValidated,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [$delegateForm.reset, $shards.reinit],
});

export const formModel = {
  $delegateForm,
  $proxyWallet,
  $signatories,

  $accounts,
  $accountsBalances,
  $delegateBalanceRange,
  $proxyBalance,

  $feeData,
  $isFeeLoading,

  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    txWrapperChanged,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
