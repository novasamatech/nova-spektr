import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset, type Chain, type Conviction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  allEqual,
  formatAmount,
  getBalanceBn,
  getRelaychainAsset,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount } from '@/domains/network';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel } from '@/features/governance';
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

const $target = createStore<DelegateAccount | null>(null);
const $tracks = createStore<number[]>([]);

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $previousConviction = createStore<Conviction>('None');

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (initiator, fields, { fee, isProxy, proxyBalance, network, initiatorBalance }) => {
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy) {
              if (new BN(fee).gt(new BN(proxyBalance))) {
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
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _fields, { fee, multisigDeposit, isMultisig, signatoryBalance }) => {
            if (!isMultisig) return;

            if (!signatory || Object.keys(signatory).length === 0) {
              return { message: 'transfer.noSignatoryError' };
            }

            const required = new BN(multisigDeposit).add(new BN(fee));
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
            fee: $fee,
            isMultisig: $isMultisig,
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (value, fields, { fee, isMultisig, network, delegateBalanceRange, initiatorBalance }) => {
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
              const feeBN = new BN(fee);
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

const $availableBalance = combine(
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
      balance: transferableAmountBN(balance),
      lock,
      available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
    };
  },
);

const $initiatorBalance = $availableBalance.map((account) => {
  return account?.available.toString() || ZERO_BALANCE;
});

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : null;
  },
);

const $delegateBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $walletData = combine({
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $activeDelegations = combine(
  { delegations: delegationAggregate.$activeDelegations, delegate: $target },
  ({ delegations, delegate }) => {
    if (!delegate) return {};

    return delegations[delegate.address] || {};
  },
);

const $coreTx = combine(
  {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    signatory: form.fields.signatory.$value,
    activeTracks: delegationAggregate.$activeTracks,
    activeDelegations: $activeDelegations,
    amount: form.fields.amount.$value,
    conviction: form.fields.conviction.$value,
    isUnchanged: form.fields.isUnchanged.$value,
  },
  ({ walletData, target, tracks, signatory, activeTracks, activeDelegations, amount, conviction, isUnchanged }) => {
    if (nullable(walletData?.chain) || nullable(target) || tracks.length === 0 || nullable(signatory)) {
      return null;
    }

    const address = toAddress(signatory.accountId, { prefix: walletData.chain!.addressPrefix });
    const finalConviction = isUnchanged ? activeDelegations[address]?.conviction : conviction;
    const finalAmount = isUnchanged
      ? activeDelegations[address]?.balance.toString()
      : walletData.chain && formatAmount(amount, walletData.chain.assets[0].precision);

    return transactionBuilder.buildEditDelegation({
      chain: walletData.chain!,
      accountId: signatory.accountId,
      balance: finalAmount || '0',
      conviction: finalConviction || 'None',
      previousConviction: activeDelegations[address]?.conviction || 'None',
      target: target!.address || '',
      tracks,
      undelegateTracks:
        activeTracks[target!.address]?.[
          toAddress(signatory.accountId, { prefix: walletData.chain!.addressPrefix })
        ]?.map(Number) || [],
    });
  },
);

const { $fee, $pendingFee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
});

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);
const $isMultisig = $route.map((route) => nonNullable(route.find(accountUtils.isMultisigAccount)));
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit, $pending: _pendingDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
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

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ signatory, balances, network }) => {
    if (!signatory || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeePending: $pendingFee,
  },
  ({ isFormValid, isFeePending }) => {
    return isFormValid && !isFeePending;
  },
);

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
  clock: form.$values.updates,
  source: { networkStore: $networkStore, account: $availableBalance, initiator: form.fields.initiator.$value },
  filter: ({ networkStore, account, initiator }) =>
    nonNullable(networkStore) && nonNullable(account) && nonNullable(initiator),
  fn: ({ account, initiator }, formData) => {
    const locks = account ? { [initiator!.accountId]: account.lock } : {};

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
  fn: (network, { activeDelegations, shards }) => {
    const address = toAddress(shards[0].accountId, { prefix: network!.chain.addressPrefix });

    return activeDelegations[address].conviction;
  },
  target: $previousConviction,
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $availableBalance,
  $initiatorBalance,
  $delegateBalanceRange,
  $proxyBalance,
  $previousConviction,

  $fee,
  $pendingFee,
  $tx,
  $multisigTx,
  $route,
  $multisigDeposit,

  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,

  $proxyAccount,
  $isProxy,

  events: {
    formInitiated,
    formCleared,
  },
  output: {
    formSubmitted,
    formChanged,
  },

  $signatoryBalance,

  $walletData,
  $target,
  $tracks,
  $activeDelegations,

  $coreTx,
};
