import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { uniqBy } from 'lodash';
import { and, not, spread } from 'patronum';

import { type Asset, type Chain, RewardsDestination } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getRelaychainAsset,
  isStringsMatchQuery,
  nonNullable,
  nullable,
  reservableAmountBN,
  stakedAmountBN,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxValidationStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { bondNominateValidator } from '@/features/operations/OperationsValidation';
import { validatorsModel } from '@/features/staking';
import { type WalletData } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
  destination: string;
};

const formInitiated = createEvent<WalletData>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();
const destinationQueryChanged = createEvent<string>();
const destinationTypeChanged = createEvent<RewardsDestination>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $destinationQuery = restore(destinationQueryChanged, '');
const $destinationType = restore(destinationTypeChanged, RewardsDestination.RESTAKE);

const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);

const multisigDepositChanged = createEvent<string>();
const $multisigDeposit = restore(multisigDepositChanged, null);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const $validators = restore(validatorsModel.output.formSubmitted, []);

const form: Form<FormParams> = createForm<FormParams>({
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
    },
    destination: {
      defaultValue: '',
      validator: () => {
        return {
          source: $destinationType,
          fn: (destination, _, destinationType) => {
            if (destinationType === RewardsDestination.TRANSFERABLE && !validateAddress(destination)) {
              return { message: 'staking.bond.incorrectAddressError' };
            }
          },
        };
      },
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
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId) ?? null;
  },
);

const $initiatorBalance = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return null;

    return balanceUtils.getBalance(balances, initiator.accountId, network.chain.chainId, network.asset.assetId);
  },
);

const $reservableAmount = $initiatorBalance.map((initiatorBalance) => {
  return initiatorBalance ? reservableAmountBN(initiatorBalance) : null;
});

const $stakedAmount = $initiatorBalance.map((initiatorBalance) => {
  return initiatorBalance ? stakedAmountBN(initiatorBalance) : null;
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $destinationAccounts = combine(
  {
    wallets: walletModel.$wallets,
    network: $networkStore,
    query: $destinationQuery,
  },
  ({ wallets, network, query }) => {
    if (!network) return [];

    const filteredAccounts = walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);

      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isVaultShardAccount(account);
      const isChainAndCryptoMatch = accountService.isAccountAvailableOnChain(account, network.chain);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });

    return uniqBy(filteredAccounts, 'accountId');
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

const $coreTx = combine(
  {
    chain: $chain,
    signatory: form.fields.signatory.$value,
    amount: form.fields.amount.$value,
    destination: form.fields.destination.$value,
    destinationType: $destinationType,
    validators: $validators,
    networkStore: $networkStore,
  },
  ({ chain, signatory, amount, destination, destinationType, validators, networkStore }) => {
    if (nullable(chain) || nullable(signatory) || nullable(networkStore)) {
      return null;
    }

    if (destinationType !== RewardsDestination.RESTAKE) {
      if (nullable(destination) || !validateAddress(destination)) {
        return null;
      }
    }

    return transactionBuilder.buildBondNominate({
      chain: chain,
      asset: networkStore.asset,
      accountId: signatory.accountId,
      amount: amount,
      destination: destinationType === RewardsDestination.RESTAKE ? 'Staked' : { destination: toAddress(destination!) },
      nominators: validators.map(({ accountId }) => accountId),
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

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: bondNominateValidator,
  params: {
    api: $api,
    chain: $chain,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
    amount: form.fields.amount.$value,
  },
});

const $canSubmit = and($valid, form.$isValid, not($pendingFee));

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
  source: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: $route,
  fn: (route) => {
    const proxyAccount = route.find(accountUtils.isProxiedAccount);
    const isMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

    return {
      proxyAccount: proxyAccount ?? null,
      isProxy: nonNullable(proxyAccount),
      isMultisig: isMultisigAccount,
    };
  },
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    proxyAccount: $proxyAccount,
  }),
});

const $bondBalanceRange = $reservableAmount.map((reservableAmount) => {
  if (nullable(reservableAmount)) return ZERO_BALANCE;

  const minBondBalance = reservableAmount;
  return minBondBalance.isZero() ? ZERO_BALANCE : [ZERO_BALANCE, minBondBalance.toString()];
});

const $reusableLock = combine(
  { reservableAmount: $reservableAmount, stakedAmount: $stakedAmount, balance: $initiatorBalance },
  ({ reservableAmount, stakedAmount, balance }) => {
    if (nullable(stakedAmount) || nullable(reservableAmount) || nullable(balance)) {
      return null;
    }

    const reusableLock = balance.frozen.sub(stakedAmount);

    if (reusableLock.isZero() || reusableLock.isNeg()) {
      return BN_ZERO;
    }
    return BN.min(reusableLock, reservableAmount);
  },
);

sample({
  clock: form.fields.initiator.change,
  target: form.fields.amount.reset,
});

sample({
  source: {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
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
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.$values.updates,
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
  $destinationAccounts,
  $destinationQuery,
  $destinationType,

  $bondBalanceRange,
  $proxyBalance,
  $reusableLock,

  $multisigDeposit,
  $fee,
  $pendingFee,
  $tx,
  $coreTx,
  $route,
  $api,
  $networkStore,
  $isMultisig,
  $canSubmit,
  $errors,

  formInitiated,
  formCleared,
  destinationQueryChanged,
  destinationTypeChanged,
  multisigDepositChanged,
  formSubmitted,
  formChanged,
};
