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
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { type StakingMap, eraService, useStakingData } from '@/entities/staking';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { networkSelectorModel } from '@/features/governance';
import { type NetworkStore } from '../lib/types';

export type FormParams = {
  shards: AnyAccount[];
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
const eraSet = createEvent<number>();
const formCleared = createEvent();

const feeChanged = createEvent<string>();
const totalFeeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $staking = restore(stakingSet, null);
const $era = restore(eraSet, null);
const $stakingUnsub = createStore<() => void>(noop);
const $eraUnsub = createStore<() => void>(noop);

const $shards = createStore<AnyAccount[]>([]);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

// const $withdrawBalance = createStore<string>(ZERO_BALANCE);

const $fee = restore(feeChanged, ZERO_BALANCE);
const $totalFee = restore(totalFeeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $selectedSignatories = createStore<AnyAccount[]>([]);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    shards: {
      defaultValue: [],
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
              const isEnough = form.shards.every((_: AnyAccount, index: number) => {
                return new BN(fee).lte(new BN(availableBalance[index].balance));
              });

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
    shards: form.fields.shards.$value,
    chain: networkSelectorModel.$governanceChain,
    balances: balanceModel.$balances,
    accounts: accounts.$list,
  },
  ({ balances, chain, shards }) => {
    if (!shards || !shards.length || !chain) return BN_ZERO;

    const nativeAsset = getNativeAsset(chain.assets);
    const accountBalance = balanceUtils.getBalance(
      balances,
      shards[0].accountId,
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

const $txWrappers = combine(
  {
    wallet: walletModel.$activeWallet,
    wallets: walletModel.$wallets,
    shards: $shards,
    network: $networkStore,
    signatories: $selectedSignatories,
  },
  ({ wallet, shards, wallets, network, signatories }) => {
    if (!wallet || !network || shards.length !== 1) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isVaultBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account: shards[0],
      signatories,
    });
  },
);

const $realAccounts = combine(
  {
    txWrappers: $txWrappers,
    shards: form.fields.shards.$value,
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

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    accounts: $realAccounts,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, accounts, wallets }) => {
    if (!isProxy || accounts.length === 0) return undefined;

    return walletUtils.getWalletById(wallets, accounts[0].walletId);
  },
  { skipVoid: false },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    shards: $shards,
    era: $era,
    staking: $staking,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, era, shards, staking, balances }) => {
    if (!wallet || !network || !staking) return [];

    const { chain, asset } = network;

    return shards.map((shard) => {
      const balance = balanceUtils.getBalance(balances, shard.accountId, chain.chainId, asset.assetId.toString());
      const address = toAddress(shard.accountId, { prefix: chain.addressPrefix });
      const withdraw = redeemableAmount(staking[address]?.unlocking, era || 0);

      return {
        account: shard,
        balances: { balance: transferableAmount(balance), withdraw },
      };
    });
  },
);

const $signatories = combine(
  {
    network: $networkStore,
    txWrappers: $txWrappers,
    balances: balanceModel.$balances,
  },
  ({ network, txWrappers, balances }) => {
    if (!network) return [];

    const { chain, asset } = network;

    return txWrappers.reduce<{ signer: AnyAccount; balance: string }[][]>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId.toString());

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
  },
);

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    signatories: $signatories,
  },
  ({ signatory, signatories }) => {
    const match = signatories[0].find(({ signer }) => signer.id === signatory?.id);

    return match?.balance || ZERO_BALANCE;
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

const $pureTxs = combine(
  {
    network: $networkStore,
    form: form.$values,
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
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
);

const $canSubmit = combine(
  {
    isFormValid: createStore(true), // todo check all fields? form should export isValid?
    isFeeLoading: $isFeeLoading,
    isStakingLoading: subscribeStakingFx.pending,
    isEraLoading: subscribeEraFx.pending,
  },
  ({ isFormValid, isFeeLoading, isStakingLoading, isEraLoading }) => {
    return isFormValid && !isFeeLoading && !isStakingLoading && !isEraLoading;
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
    shards,
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    shards: $shards,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    shards: $shards,
  },
  filter: ({ networkStore, api }) => {
    return Boolean(networkStore) && Boolean(api);
  },
  fn: ({ networkStore, api, shards }) => {
    const addresses = shards.map((shard) => toAddress(shard.accountId, { prefix: networkStore!.chain.addressPrefix }));

    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      addresses,
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

const $withdrawBalance = combine(
  {
    accounts: $accounts,
  },
  ({ accounts }) => {
    if (accounts.length === 0) return ZERO_BALANCE;

    return accounts.reduce((acc, { balances: { withdraw } }) => {
      if (!withdraw) return acc;

      return new BN(withdraw).add(new BN(acc)).toString();
    }, ZERO_BALANCE);
  },
);

sample({
  clock: formInitiated,
  source: $shards,
  filter: (shards) => shards.length > 0,
  target: form.fields.shards.change,
});

sample({
  clock: form.fields.signatory.$value,
  filter: (signatory: AnyAccount | null): signatory is AnyAccount => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: form.fields.shards.change,
  target: form.fields.amount.reset,
});

sample({
  clock: form.fields.amount.change,
  target: form.fields.shards.reset,
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
    proxyAccounts: $realAccounts,
  },
  ({ isProxy, balances, network, proxyAccounts }) => {
    if (!isProxy || !network || proxyAccounts.length === 0) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccounts[0].accountId,
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
    realAccounts: $realAccounts,
    network: $networkStore,
    transactions: $transactions,
    isProxy: $isProxy,
    fee: $fee,
    totalFee: $totalFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transactions }) => {
    return Boolean(network) && Boolean(transactions);
  },
  fn: ({ amount, realAccounts, transactions, isProxy, ...fee }, formData) => {
    const { shards, ...rest } = formData;

    return {
      transactions: transactions!.map((tx) => ({
        wrappedTx: tx.wrappedTx,
        multisigTx: tx.multisigTx,
        coreTx: tx.coreTx,
      })),
      formData: {
        ...fee,
        ...rest,
        amount,
        shards: realAccounts,
        ...(isProxy && { proxiedAccount: shards[0] as ProxiedAccount }),
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
  clock: formSubmitted,
  target: attach({
    source: $eraUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formCleared,
  target: [form.reset, $shards.reinit],
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,
  $txWrappers,

  $accounts,
  $availableBalance,
  $withdrawBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,

  $api,
  $networkStore,
  $transactions,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading: subscribeStakingFx.pending,
  $isEraLoading: subscribeEraFx.pending,
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
