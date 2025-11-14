import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { noop } from 'lodash';
import { and, not, spread } from 'patronum';

import { type Asset, type Chain, type ChainId } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
  unlockingAmount,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createComplexTxStore, createSignatoriesStore, createTxValidationStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { type StakingMap, stakingUtils, useStakingData } from "@/entities/staking";
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { restakeValidator } from '@/features/operations/OperationsValidation';
import { type NetworkStore } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = FormParams & {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const stakingSet = createEvent<StakingMap>();
const formCleared = createEvent();

const multisigDepositChanged = createEvent<string>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $staking = restore(stakingSet, null);
const $minBond = createStore<string>(ZERO_BALANCE);
const $stakingUnsub = createStore<() => void>(noop);

const $restakeBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (nullable(signatory)) {
          return { message: 'transfer.noSignatoryError' };
        }
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            network: $networkStore,
            restakeBalanceRange: $restakeBalanceRange,
            availableBalance: $availableBalance,
            fee: $fee,
          }),
          fn: (amount, _f, { network, restakeBalanceRange, availableBalance, fee }) => {
            if (nullable(amount) || amount === '') {
              return { message: 'transfer.requiredAmountError' };
            }

            if (amount === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(amount, network.asset.precision));
            const restakeBalance = Array.isArray(restakeBalanceRange) ? restakeBalanceRange[1] : restakeBalanceRange;
            const isNotEnoughBalance = amountBN.gt(new BN(restakeBalance));
            if (isNotEnoughBalance) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            const isNotEnoughBalanceForFee = fee.gt(new BN(availableBalance.balance));
            if (isNotEnoughBalanceForFee) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
            }
          },
        };
      },
    },
  },
});

// Effects
type StakingParams = {
  chainId: ChainId;
  api: ApiPromise;
  accounts: AccountId[];
};
const subscribeStakingFx = createEffect(({ chainId, api, accounts }: StakingParams): Promise<() => void> => {
  const boundStakingSet = scopeBind(stakingSet, { safe: true });

  return stakingUtils.subscribeStaking(chainId, api, accounts, boundStakingSet);
});

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return useStakingData().getMinNominatorBond(api);
});

// Computed

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
    if (!network) return null;

    return apis[network.chain.chainId] ?? null;
  },
);

const $coreTx = combine(
  {
    network: $networkStore,
    form: form.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (nullable(network) || nullable(form.signatory) || !isConnected) return null;

    return transactionBuilder.buildRestake({
      chain: network.chain,
      asset: network.asset,
      accountId: form.signatory.accountId,
      amount: form.amount || ZERO_BALANCE,
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

const $realAccount = combine(
  {
    route: $route,
    initiator: form.fields.initiator.$value,
  },
  ({ route, initiator }) => {
    if (nullable(initiator)) return null;
    if (route.length === 0) return initiator;

    const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
    if (multisigAccount) {
      return multisigAccount;
    }

    const proxyAccount = route.find(accountUtils.isProxiedAccount);
    return proxyAccount ?? null;
  },
);

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isAnyMultisigAccount(acc));
});

const $isProxy = $route.map((route) => {
  return route.some((acc) => accountUtils.isProxiedAccount(acc));
});

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    account: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, account, wallets }) => {
    if (!isProxy || nullable(account)) return null;

    return walletUtils.getWalletById(wallets, account.walletId);
  },
);

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: restakeValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $availableBalance = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    staking: $staking,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, staking, balances }) => {
    if (nullable(wallet) || nullable(network) || nullable(staking) || nullable(initiator)) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    const activeStake = staking[initiator.accountId]?.active || ZERO_BALANCE;

    return { balance: transferableAmount(balance), stake: activeStake };
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $canSubmit = and($valid, form.$isValid, not($pendingFee), not(subscribeStakingFx.pending));

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => Boolean(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    initiator: shards[0],
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $api,
  filter: (api): api is ApiPromise => nonNullable(api),
  target: getMinNominatorBondFx,
});

sample({
  clock: getMinNominatorBondFx.doneData,
  target: $minBond,
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ networkStore, api, initiator }) => {
    return nonNullable(networkStore) && nonNullable(api) && nonNullable(initiator);
  },
  fn: ({ networkStore, api, initiator }) => {
    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts: [initiator!.accountId],
    };
  },
  target: subscribeStakingFx,
});

sample({
  clock: formInitiated,
  source: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: subscribeStakingFx.doneData,
  target: $stakingUnsub,
});

sample({
  source: {
    staking: $staking,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ staking }) => nonNullable(staking),
  fn: ({ staking, initiator }) => {
    if (nullable(initiator)) return ZERO_BALANCE;

    const unstakedBalance = unlockingAmount(staking![initiator.accountId]?.unlocking);

    return unstakedBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, unstakedBalance];
  },
  target: $restakeBalanceRange,
});

sample({
  clock: form.fields.initiator.change,
  target: form.fields.amount.reset,
});

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
    proxyAccount: $realAccount,
  },
  filter: ({ isProxy, network, proxyAccount }) => {
    return isProxy && nonNullable(network) && nonNullable(proxyAccount);
  },
  fn: ({ balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    network: $networkStore,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, fee }) => nonNullable(network) && nonNullable(fee),
  fn: ({ network, fee, multisigDeposit }, formData) => {
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      fee: fee!.toString(),
      totalFee: fee!.toString(),
      multisigDeposit,
      ...formData,
      amount,
    };
  },
  target: formSubmitted,
});

sample({
  clock: formSubmitted,
  target: attach({
    source: $stakingUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,

  $proxyWallet,
  $signatories,
  $coreTx,
  $route,
  $restakeBalanceRange,
  $proxyBalance,

  $fee,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $tx,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading: subscribeStakingFx.pending,
  $canSubmit,
  $errors,

  formInitiated,
  formCleared,
  multisigDepositChanged,
  formSubmitted,
};
