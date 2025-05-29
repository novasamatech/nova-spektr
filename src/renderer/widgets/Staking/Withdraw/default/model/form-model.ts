import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
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
  getNativeAsset,
  getRelaychainAsset,
  nonNullable,
  redeemableAmount,
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { type StakingMap, eraService, useStakingData } from '@/entities/staking';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type NetworkStore } from '../lib/types';

export type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transaction: Transaction;
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
const eraSet = createEvent<number>();
const formCleared = createEvent();

const multisigDepositChanged = createEvent<string>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $staking = restore(stakingSet, null);
const $era = restore(eraSet, null);
const $stakingUnsub = createStore<() => void>(noop);
const $eraUnsub = createStore<() => void>(noop);

const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);
const $chain = $networkStore.map((network) => network?.chain ?? null);

const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

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
          }),
          fn: (_s, _f, { fee, isProxy, proxyBalance }) => {
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
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory, _f, { fee, isMultisig, signatoryBalance, multisigDeposit }) => {
            if (isMultisig && new BN(multisigDeposit).add(new BN(fee)).gt(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }

            if (signatory && Object.keys(signatory).length <= 0) {
              return { message: 'proxy.addProxy.noSignatoryError' };
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
            availableBalance: $availableBalance,
          }),
          fn: (value, form, { fee, isMultisig, availableBalance }) => {
            if (!value) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            if (isMultisig) {
              const isEnough = new BN(fee).lte(new BN(availableBalance.balance));

              if (!isEnough) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $availableBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    chain: $chain,
    balances: balanceModel.$balances,
    accounts: accounts.$list,
  },
  ({ balances, chain, initiator }) => {
    if (!initiator || !chain) return BN_ZERO;

    const nativeAsset = getNativeAsset(chain.assets);
    const accountBalance = balanceUtils.getBalance(
      balances,
      initiator.accountId,
      chain.chainId,
      nativeAsset.assetId.toString(),
    );
    if (!accountBalance) return BN_ZERO;

    return transferableAmount(accountBalance);
  },
);

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

const subscribeEraFx = createEffect((api: ApiPromise): Promise<() => void> => {
  const boundEraSet = scopeBind(eraSet, { safe: true });

  return eraService.subscribeActiveEra(api, (era) => {
    if (!era) return;

    boundEraSet(era);
  });
});

// Computed

const $txWrappers = createTxWrappers({
  initiator: form.fields.initiator.$value,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: $chain,
  signatory: form.fields.signatory.$value,
});

// const $txWrappers = combine(
//   {
//     wallet: walletSelect.$selectedWallet,
//     wallets: walletModel.$wallets,
//     initiator: form.fields.initiator.$value,
//     network: $networkStore,
//     signatory: form.fields.signatory.$value,
//   },
//   ({ wallet, initiator, wallets, network, signatory }) => {
//     if (!wallet || !network || !initiator || !signatory) return [];

//     const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
//       walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
//       accountFn: (a, w) => {
//         const isBase = accountUtils.isVaultBaseAccount(a);
//         const isPolkadotVault = walletUtils.isPolkadotVault(w);

//         return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
//       },
//     });

//     return transactionService.getTxWrappers({
//       wallet,
//       wallets: filteredWallets || [],
//       account: initiator,
//       signatories: [signatory],
//     });
//   },
// );

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    initiator: form.fields.initiator.$value,
  },
  ({ txWrappers, initiator }) => {
    if (!initiator) return null;
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
    if (!isProxy || !account) return undefined;

    return walletUtils.getWalletById(wallets, account.walletId);
  },
  { skipVoid: false },
);

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    era: $era,
    staking: $staking,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, era, initiator, staking, balances }) => {
    if (!wallet || !network || !staking || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString());
    const address = toAddress(initiator.accountId, { prefix: chain.addressPrefix });
    const withdraw = redeemableAmount(staking[address]?.unlocking, era || 0);

    return {
      account: initiator,
      balances: { balance: transferableAmount(balance), withdraw },
    };
  },
);

const $withdrawBalance = combine(
  {
    account: $account,
  },
  ({ account }) => {
    if (!account) return ZERO_BALANCE;

    return account.balances.withdraw;
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
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
    if (!network || !isConnected || !form.initiator) return null;

    return transactionBuilder.buildWithdraw({
      chain: network.chain,
      accountId: form.initiator.accountId,
    });
  },
  { skipVoid: false },
);

const { $fee, $pendingFee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

const $canSubmit = combine(
  {
    isFeeLoading: $pendingFee,
    isFormValid: form.$isValid,
    isStakingLoading: subscribeStakingFx.pending,
    isEraLoading: subscribeEraFx.pending,
  },
  ({ isFeeLoading, isStakingLoading, isEraLoading, isFormValid }) => {
    return !isFeeLoading && !isStakingLoading && !isEraLoading && isFormValid;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  fn: ({ chain, shards }) => {
    return {
      initiator: shards[0],
      networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    };
  },
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
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
    const address = toAddress(initiator!.accountId, { prefix: networkStore!.chain.addressPrefix });

    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      addresses: [address],
    };
  },
  target: subscribeStakingFx,
});

sample({
  clock: formInitiated,
  source: $api,
  filter: (api): api is ApiPromise => Boolean(api),
  target: subscribeEraFx,
});

sample({
  clock: subscribeStakingFx.doneData,
  target: $stakingUnsub,
});

sample({
  clock: subscribeEraFx.doneData,
  target: $eraUnsub,
});

//todo not sure if there is any reason to do that actually
sample({
  clock: formInitiated,
  source: form.fields.initiator.$value,
  filter: (initiator) => nonNullable(initiator),
  target: form.fields.initiator.change,
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

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    balances: balanceModel.$balances,
    network: $networkStore,
    proxyAccount: $realAccount,
  },
  ({ isProxy, balances, network, proxyAccount }) => {
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

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    amount: $withdrawBalance,
    realAccount: $realAccount,
    network: $networkStore,
    transaction: $tx,
    isProxy: $isProxy,
    fee: $fee.map((fee) => fee.toString()),
    totalFee: $fee.map((fee) => fee.toString()),
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return nonNullable(network) && nonNullable(transaction);
  },
  fn: ({ realAccount, transaction, isProxy, ...rest }, formData) => {
    return {
      transaction: transaction!,
      formData: {
        ...rest,
        ...formData,
        ...(isProxy && { proxiedAccount: realAccount as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: [formInitiated, $withdrawBalance],
  source: $withdrawBalance,
  fn: (withdrawBalance, _) => withdrawBalance,
  target: form.fields.amount.change,
});

sample({
  clock: formSubmitted,
  target: attach({
    source: $stakingUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formSubmitted,
  target: attach({
    source: $eraUnsub,
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
  $balances: balanceModel.$balances,

  $account,
  $availableBalance,
  $withdrawBalance,
  $proxyBalance,

  $fee,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $coreTx,
  $tx,
  $multisigTx,
  $route,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading: subscribeStakingFx.pending,
  $isEraLoading: subscribeEraFx.pending,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,
    multisigDepositChanged,
  },
  output: {
    formSubmitted,
  },
};
