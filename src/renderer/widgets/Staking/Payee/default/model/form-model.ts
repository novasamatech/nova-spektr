import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Address, type Asset, type Chain, RewardsDestination } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getRelaychainAsset,
  isStringsMatchQuery,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type FormInput } from '../lib/types';

export type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  destination: Address;
};

const formInitiated = createEvent<FormInput>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();
const destinationQueryChanged = createEvent<string>();
const destinationTypeChanged = createEvent<RewardsDestination>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $chain = $networkStore.map((network) => network?.chain ?? null);

const $destinationQuery = restore(destinationQueryChanged, '');
const $destinationType = restore(destinationTypeChanged, RewardsDestination.RESTAKE);

const multisigDepositChanged = createEvent<string>();
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
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (
            initiator: AnyAccount | null,
            form: FormParams,
            { isProxy, proxyBalance, fee, network, initiatorBalance }: any,
          ) => {
            if (!initiator) {
              return { message: 'staking.bond.noAccountError' };
            }

            if (isProxy && !new BN(fee).lte(new BN(proxyBalance))) {
              return { message: 'proxy.addProxy.notEnoughProxyTokens' };
            }

            if (!isProxy && network && new BN(fee).gt(new BN(initiatorBalance))) {
              return { message: 'staking.bond.noBondBalanceError' };
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
          fn: (
            signatory: AnyAccount | null,
            _form: FormParams,
            { fee, multisigDeposit, isMultisig, signatoryBalance }: any,
          ) => {
            if (isMultisig && signatory && Object.keys(signatory).length <= 0) {
              return { message: 'transfer.noSignatoryError' };
            }

            if (isMultisig && !new BN(multisigDeposit).add(new BN(fee)).lte(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    destination: {
      defaultValue: '' as Address,
      validator: () => {
        return {
          source: $destinationType,
          fn: (value: Address, _form: FormParams, destinationType: RewardsDestination) => {
            if (destinationType === RewardsDestination.RESTAKE) return;

            if (!validateAddress(value)) {
              return { message: 'proxy.addProxy.proxyAddressRequiredError' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

// Computed

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

    return walletUtils.getAccountsBy(wallets, (account, wallet) => {
      const isPvWallet = walletUtils.isPolkadotVault(wallet);
      const isBaseAccount = accountUtils.isVaultBaseAccount(account);
      if (isBaseAccount && isPvWallet) return false;

      const isShardAccount = accountUtils.isVaultShardAccount(account);
      const isChainAndCryptoMatch = accountUtils.isChainAndCryptoMatch(account, network.chain);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

      return isChainAndCryptoMatch && !isShardAccount && isStringsMatchQuery(query, [account.name, address]);
    });
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

const $initiatorBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ balances, initiator, network }) => {
    if (!initiator || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      initiator.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $bondBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === '0') return '0';

  return ['0', initiatorBalance];
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

const $coreTx = combine(
  {
    signatory: form.fields.signatory.$value,
    destination: form.fields.destination.$value,
    chain: $chain,
  },
  ({ signatory, destination, chain }) => {
    if (!signatory || !chain) return null;

    return transactionBuilder.buildSetPayee({
      chain,
      accountId: signatory.accountId,
      destination,
    });
  },
);

const $txWrappers = createTxWrappers({
  initiator: form.fields.initiator.$value,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: $chain,
  signatory: form.fields.signatory.$value,
});

const { $fee, $pendingFee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)));
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

const $multisigAccount = $route.map((route) => route.find((account) => accountUtils.isMultisigAccount(account)));

const $isMultisig = $multisigAccount.map((account) => nonNullable(account));

const $proxyWallet = combine(
  {
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ proxyAccount, wallets }) => {
    if (nullable(proxyAccount)) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
    if (!isProxy || !proxyAccount || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
  },
  ({ isFormValid, isFeeLoading }) => isFormValid && !isFeeLoading,
);

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

// Submit

sample({
  clock: form.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (networkStore, formData) => {
    const destination = toAddress(formData.destination, { prefix: networkStore!.chain.addressPrefix });

    return { ...formData, destination };
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
  $destinationAccounts,
  $destinationQuery,
  $destinationType,

  $initiatorBalance,
  $bondBalanceRange,
  $proxyBalance,
  $proxyAccount,

  $tx,
  $multisigTx,
  $coreTx,
  $txWrappers,
  $route,
  $fee,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $isMultisig,
  $multisigAccount,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,
    destinationQueryChanged,
    destinationTypeChanged,
    multisigDepositChanged, // todo fucking change it
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
