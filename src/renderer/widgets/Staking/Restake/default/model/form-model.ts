import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import noop from 'lodash/noop';
import { spread } from 'patronum';

import {
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
} from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  unlockingAmount,
} from '@/shared/lib/utils';
import { createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { type StakingMap, useStakingData } from '@/entities/staking';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type NetworkStore } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  }[];
  formData: FormParams & {
    signatory: AnyAccount | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const stakingSet = createEvent<StakingMap>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $staking = restore(stakingSet, null);
const $minBond = createStore<string>(ZERO_BALANCE);
const $stakingUnsub = createStore<() => void>(noop);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $restakeBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $totalFee = restore(totalFeeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<AnyAccount[]>([]);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
          fn: (_v, _f, { isProxy, proxyBalance, fee }) => {
            if (isProxy && new BN(fee).gt(new BN(proxyBalance))) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
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
          fn: (signatory, _f, { fee, isMultisig, multisigDeposit, signatoryBalance }) => {
            const isNotEnoughMultisigTokens =
              isMultisig && new BN(multisigDeposit).add(new BN(fee)).gt(new BN(signatoryBalance));
            if (isNotEnoughMultisigTokens) {
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
            network: $networkStore,
            restakeBalanceRange: $restakeBalanceRange,
            account: $account,
          }),
          fn: (amount, _f, { network, restakeBalanceRange, account }) => {
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

            const isNotEnoughBalanceForFee = amountBN.gt(new BN(account.balances.balance));
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
  addresses: Address[];
};
const subscribeStakingFx = createEffect(({ chainId, api, addresses }: StakingParams): Promise<() => void> => {
  const boundStakingSet = scopeBind(stakingSet, { safe: true });

  return useStakingData().subscribeStaking(chainId, api, addresses, boundStakingSet);
});

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return useStakingData().getMinNominatorBond(api);
});

// Computed

const $txWrappers = createTxWrappers({
  initiator: form.fields.initiator.$value,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: $chain,
  signatory: form.fields.signatory.$value,
});

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    initiator: form.fields.initiator.$value,
  },
  ({ txWrappers, initiator }) => {
    if (nullable(initiator)) return null;
    if (txWrappers.length === 0) return initiator;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

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

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    staking: $staking,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, initiator, staking, balances }) => {
    if (nullable(wallet) || nullable(network) || nullable(staking) || nullable(initiator)) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString());
    const address = toAddress(initiator.accountId, { prefix: chain.addressPrefix });
    const activeStake = staking[address]?.active || ZERO_BALANCE;

    return {
      account: initiator,
      balances: { balance: transferableAmount(balance), stake: activeStake },
    };
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

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

const $pureTx = combine(
  {
    network: $networkStore,
    form: form.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (nullable(network) || nullable(form.initiator) || !isConnected) return null;

    return transactionBuilder.buildRestake({
      chain: network.chain,
      asset: network.asset,
      accountId: form.initiator.accountId,
      amount: form.amount || ZERO_BALANCE,
    });
  },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    networkStore: $networkStore,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ apis, networkStore, pureTx, txWrappers }) => {
    if (nullable(networkStore) || nullable(pureTx)) return null;

    return transactionService.getWrappedTransaction({
      api: apis[networkStore.chain.chainId],
      transaction: pureTx,
      txWrappers,
    });
  },
);

const $canSubmit = combine(
  {
    isFeeLoading: $isFeeLoading,
    isStakingLoading: subscribeStakingFx.pending,
  },
  ({ isFeeLoading, isStakingLoading }) => {
    return !isFeeLoading && !isStakingLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [form.reset, $selectedSignatories.reinit],
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
  filter: (api): api is ApiPromise => Boolean(api),
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
    const addresses = [toAddress(initiator!.accountId, { prefix: networkStore!.chain.addressPrefix })];

    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      addresses,
    };
  },
  target: subscribeStakingFx,
});

sample({
  clock: subscribeStakingFx.doneData,
  target: $stakingUnsub,
});

sample({
  source: {
    staking: $staking,
    networkStore: $networkStore,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ staking, networkStore }) => Boolean(staking) && Boolean(networkStore),
  fn: ({ staking, networkStore, initiator }) => {
    if (nullable(initiator)) return ZERO_BALANCE;

    const address = toAddress(initiator.accountId, { prefix: networkStore!.chain.addressPrefix });

    const unstakedBalance = unlockingAmount(staking![address]?.unlocking);

    return unstakedBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, unstakedBalance];
  },
  target: $restakeBalanceRange,
});

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

sample({
  clock: form.fields.signatory.$value,
  filter: (signatory: AnyAccount | null): signatory is AnyAccount => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: form.fields.initiator.change,
  target: form.fields.amount.reset,
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

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
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
      network!.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    realAccount: $realAccount,
    network: $networkStore,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    totalFee: $totalFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return nonNullable(network) && nonNullable(transaction);
  },
  fn: ({ realAccount, network, transaction, isProxy, fee, totalFee, multisigDeposit }, formData) => {
    const { initiator } = formData;
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      transactions: [
        {
          wrappedTx: transaction!.wrappedTx,
          multisigTx: transaction!.multisigTx,
          coreTx: transaction!.coreTx,
        },
      ],
      formData: {
        fee,
        totalFee,
        multisigDeposit,
        ...formData,
        initiator: realAccount,
        amount,
        ...(isProxy && { proxiedAccount: initiator as ProxiedAccount }),
      },
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
  $txWrappers,

  $account,
  $restakeBalanceRange,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $transaction,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading: subscribeStakingFx.pending,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    feeChanged,
    totalFeeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
