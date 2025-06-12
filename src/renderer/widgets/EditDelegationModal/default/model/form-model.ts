import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import isEmpty from 'lodash/isEmpty';
import { spread } from 'patronum';

import { type Asset, type Chain, type Conviction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  allEqual,
  formatAmount,
  getBalanceBn,
  getRelaychainAsset,
  nonNullable,
  toAddress,
  transferableAmount,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { getLocksForAddress } from '@/features/governance/utils/getLocksForAddress';
import { type WalletData } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
  conviction: Conviction;
  locks: Record<string, BN>;
  isUnchanged: boolean;
};

const formInitiated = createEvent<
  WalletData & {
    shards: AnyAccount[];
    activeDelegations: Record<
      string,
      {
        conviction: Conviction;
        balance: BN;
      }
    >;
  }
>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const txWrapperChanged = createEvent<{
  proxyAccount: AnyAccount | null;
  signatories: AnyAccount[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();
const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $previousConviction = createStore<Conviction>('None');

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $feeData = restore(feeDataChanged, {
  fee: ZERO_BALANCE,
  totalFee: ZERO_BALANCE,
  multisigDeposit: ZERO_BALANCE,
});

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            feeData: $feeData,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (initiator, fields, { feeData, isProxy, proxyBalance, network, initiatorBalance }) => {
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy) {
              if (new BN(feeData.fee).gt(new BN(proxyBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            } else if (fields.amount) {
              const amountBN = new BN(formatAmount(fields.amount, network.asset.precision));
              if (amountBN.gt(new BN(initiatorBalance))) {
                return { message: 'staking.bond.noBondBalanceError' };
              }
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
            feeData: $feeData,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _fields, { feeData, isMultisig, signatoryBalance }) => {
            if (!isMultisig) return;

            if (!signatory || Object.keys(signatory).length === 0) {
              return { message: 'transfer.noSignatoryError' };
            }

            const required = new BN(feeData.multisigDeposit).add(new BN(feeData.fee));
            if (required.gt(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            feeData: $feeData,
            isMultisig: $isMultisig,
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (value, fields, { feeData, isMultisig, network, delegateBalanceRange, initiatorBalance }) => {
            if (fields.isUnchanged) return; // skip checks when unchanged

            if (!value) return { message: 'transfer.requiredAmountError' };
            if (value === ZERO_BALANCE) return { message: 'transfer.notZeroAmountError' };

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const delegateBalance = Array.isArray(delegateBalanceRange)
              ? delegateBalanceRange[1]
              : delegateBalanceRange;
            if (amountBN.gt(new BN(delegateBalance))) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            if (!isMultisig && fields.initiator) {
              const feeBN = new BN(feeData.fee);
              if (amountBN.add(feeBN).gt(new BN(initiatorBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
    conviction: {
      defaultValue: 'Locked1x',
    },
    locks: {
      defaultValue: {},
    },
    isUnchanged: {
      defaultValue: false,
    },
  },
  validateOn: ['submit'],
});

// Computed stores that depend on form should be declared after form

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balances,
    trackLocks: locksAggregate.$trackLocks,
  },
  ({ network, wallet, initiator, balances, trackLocks }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString());
    const address = toAddress(initiator.accountId, { prefix: network.chain.addressPrefix });
    const lock = getLocksForAddress(address, trackLocks);

    return {
      account: initiator,
      balance: transferableAmountBN(balance),
      lock,
      available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
    };
  },
);

const $initiatorBalance = $account.map((account) => {
  return account?.available.toString() || ZERO_BALANCE;
});

// Computed

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
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

    return availableSignatories.reduce<{ signer: AnyAccount; balance: string }[][]>((acc, signatories) => {
      const balancedSignatories = signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        return { signer: signatory, balance: transferableAmount(balance) };
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
    return network ? apis[network.chain.chainId] : null;
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $isFeeLoading,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => nonNullable(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    initiator: shards[0],
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $networkStore,
  filter: (network, { activeDelegations, shards }) => {
    const convictions = shards.map((shard) => {
      const address = toAddress(shard.accountId, { prefix: network!.chain.addressPrefix });

      return activeDelegations[address].conviction;
    });

    return allEqual(convictions);
  },
  fn: (network, { activeDelegations, shards }) => {
    const address = toAddress(shards[0].accountId, { prefix: network!.chain.addressPrefix });

    return { conviction: activeDelegations[address].conviction, isUnchanged: shards.length > 1 };
  },
  target: spread({
    conviction: form.fields.conviction.change,
    isUnchanged: form.fields.isUnchanged.change,
  }),
});

sample({
  clock: formInitiated,
  source: $networkStore,
  filter: (network, { shards, activeDelegations }) => {
    const balances = shards.map((shard) => {
      const address = toAddress(shard.accountId, { prefix: network!.chain.addressPrefix });

      return activeDelegations[address].balance;
    });

    return !!network && allEqual(balances, (a, b) => a.eq(b));
  },
  fn: (network, { shards, activeDelegations }) => {
    const address = toAddress(shards[0].accountId, { prefix: network!.chain.addressPrefix });
    const balance = activeDelegations[address].balance.toString();
    const precision = network!.asset.precision;

    return getBalanceBn(balance, precision).toString();
  },
  target: form.fields.amount.change,
});

sample({
  clock: formInitiated,
  source: $networkStore,
  fn: (network, { activeDelegations, shards }) => {
    const address = toAddress(shards[0].accountId, { prefix: network!.chain.addressPrefix });

    return activeDelegations[address].conviction;
  },
  target: $previousConviction,
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

// Reactive stores derived from data – declared after form so we can safely reference form fields

const $delegateBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
    if (!isProxy || !network || !proxyAccount) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    signatories: $signatories,
  },
  ({ signatory, signatories }) => {
    if (isEmpty(signatories)) return ZERO_BALANCE;

    const match = signatories[0].find(({ signer }) => signer.id === signatory?.id);
    return match?.balance || ZERO_BALANCE;
  },
);

// Submit

sample({
  clock: form.$values.updates,
  source: { networkStore: $networkStore, account: $account },
  filter: ({ networkStore, account }) => nonNullable(networkStore) && nonNullable(account),
  fn: ({ account }, formData) => {
    const locks = account ? { [account.account.accountId]: account.lock } : {};

    return { ...formData, locks };
  },
  target: formChanged,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $account,
  $initiatorBalance,
  $delegateBalanceRange,
  $proxyBalance,
  $previousConviction,

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
