import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { camelCase } from 'lodash';
import isEmpty from 'lodash/isEmpty';
import { spread } from 'patronum';

import { type XcmConfig, xcmService } from '@/shared/api/xcm';
import {
  type Account,
  type Address,
  type Chain,
  type ChainId,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyTxWrapper,
  type Transaction,
  TransactionType,
} from '@/shared/core';
import {
  TEST_ACCOUNTS,
  ZERO_BALANCE,
  formatAmount,
  getAssetId,
  nonNullable,
  toAccountId,
  toAddress,
  toLocalChainId,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createTxStore } from '@/shared/transactions';
import * as networkDomain from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { TransferType, getExtrinsic, transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { TransferRules } from '@/features/operations/OperationsValidation';
import { type NetworkStore } from '../lib/types';

import { xcmTransferModel } from './xcm-transfer-model';

type BalanceMap = Record<'balance' | 'native', string>;

type FormParams = {
  account: Account;
  xcmChain: Chain;
  signatory: Account | null;
  destination: Address;
  amount: string;
};

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: FormParams & {
    signatory: Account | null;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    xcmFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const feeChanged = createEvent<string>();
const multisigDepositChanged = createEvent<string>();
const isFeeLoadingChanged = createEvent<boolean>();

const myselfClicked = createEvent();
const xcmDestinationSelected = createEvent<AccountId>();
const xcmDestinationCancelled = createEvent();

const $networkStore = restore(formInitiated, null);
const $isNative = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);
const $isProxy = createStore<boolean>(false);

const $isMyselfXcmOpened = createStore<boolean>(false).reset(xcmDestinationCancelled);

const $accountBalance = createStore<BalanceMap>({ balance: ZERO_BALANCE, native: ZERO_BALANCE });
const $signatoryBalance = createStore<string>(ZERO_BALANCE);
const $proxyBalance = createStore<BalanceMap>({ balance: ZERO_BALANCE, native: ZERO_BALANCE });

const $fee = restore(feeChanged, ZERO_BALANCE);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);
const $isFeeLoading = restore(isFeeLoadingChanged, true);
const $isXcm = createStore<boolean>(false);
const $deliveryFee = createStore(BN_ZERO);

const $selectedSignatories = createStore<Account[]>([]);

const $totalFee = combine(
  {
    fee: $fee,
    deliveryFee: $deliveryFee,
  },
  ({ fee, deliveryFee }) => new BN(fee).add(deliveryFee).toString(),
);

const $transferForm = createForm<FormParams>({
  fields: {
    account: {
      init: {} as Account,
      rules: [
        TransferRules.account.noProxyFee(
          combine({
            fee: $totalFee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
          }),
        ),
      ],
    },
    signatory: {
      init: null,
      rules: [
        TransferRules.signatory.noSignatorySelected($isMultisig),
        TransferRules.signatory.notEnoughTokens(
          combine({
            fee: $totalFee,
            isMultisig: $isMultisig,
            multisigDeposit: $multisigDeposit,
            balance: $signatoryBalance,
          }),
        ),
      ],
    },
    xcmChain: {
      init: {} as Chain,
    },
    destination: {
      init: '',
      rules: [TransferRules.destination.required, TransferRules.destination.incorrectRecipient],
    },
    amount: {
      init: '',
      rules: [
        TransferRules.amount.required,
        TransferRules.amount.notZero,
        TransferRules.amount.notEnoughBalance(
          combine({
            network: $networkStore,
            balance: $accountBalance,
          }),
        ),
        TransferRules.amount.insufficientBalanceForXcmFee(
          combine({
            fee: $totalFee,
            xcmFee: xcmTransferModel.$xcmFee,
            network: $networkStore,
            balance: $accountBalance,
            isNative: $isNative,
            isMultisig: $isMultisig,
            isXcm: $isXcm,
            isProxy: $isProxy,
          }),
        ),
      ],
    },
  },
  validateOn: ['submit'],
});

// Computed

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

const $coreTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    form: $transferForm.$values,
    xcmData: xcmTransferModel.$xcmData,
    isConnected: $isChainConnected,
  },
  ({ network, isXcm, form, xcmData, isConnected }): Transaction | null => {
    if (!network || !isConnected || (isXcm && !xcmData) || !validateAddress(form.destination)) return null;

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: form.account.accountId,
      amount: form.amount,
      destination: form.destination,
      xcmData,
    });
  },
);

const { $wrappedTx: $transaction, $txWrappers } = createTxStore({
  $api,
  $activeWallet: walletModel.$activeWallet,
  $wallets: walletModel.$wallets,
  $chain: $transferForm.fields.xcmChain.$value,
  $coreTx,
  $account: $transferForm.fields.account.$value || null,
  $signatory: $transferForm.fields.signatory.$value || null,
});

const $fakeTx = combine(
  {
    network: $networkStore,
    isConnected: $isChainConnected,
    xcmData: xcmTransferModel.$xcmData,
  },
  ({ isConnected, network, xcmData }): Transaction | null => {
    if (!network || !isConnected) return null;

    const transactionType = network.asset.type ? TransferType[network.asset.type] : TransactionType.TRANSFER;

    const palletName =
      network.asset.typeExtras && 'palletName' in network.asset.typeExtras
        ? camelCase(network.asset.typeExtras.palletName)
        : 'assets';

    return {
      chainId: network.chain.chainId,
      address: toAddress(TEST_ACCOUNTS[0], { prefix: network.chain.addressPrefix }),
      type: transactionType,
      args: {
        palletName,
        destination: toAddress(TEST_ACCOUNTS[0], { prefix: network.chain.addressPrefix }),
        ...xcmData?.args,
      },
    };
  },
);

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $transferForm.fields.account.$value,
  },
  ({ txWrappers, account }) => {
    if (txWrappers.length === 0) return account;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $accounts = combine(
  {
    network: $networkStore,
    wallet: walletModel.$activeWallet,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, balances }) => {
    if (!wallet || !network) return [];

    const { chain, asset } = network;
    const walletAccounts = walletUtils.getAccountsBy([wallet], (a, w) => {
      const isBase = accountUtils.isVaultBaseAccount(a);
      const isPolkadotVault = walletUtils.isPolkadotVault(w);

      return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, network.chain);
    });

    return walletAccounts.map((account) => {
      const balance = balanceUtils.getBalance(balances, account.accountId, chain.chainId, asset.assetId.toString());

      let nativeBalance = balance;
      if (asset.assetId !== chain.assets[0].assetId) {
        nativeBalance = balanceUtils.getBalance(
          balances,
          account.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );
      }

      return {
        account,
        balances: { balance: transferableAmount(balance), native: transferableAmount(nativeBalance) },
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

    const { chain } = network;

    return txWrappers.reduce<{ signer: Account; balance: string }[][]>((acc, wrapper) => {
      if (!transactionService.hasMultisig([wrapper])) return acc;

      const balancedSignatories = (wrapper as MultisigTxWrapper).signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(
          balances,
          signatory.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
  },
);

const $chains = combine(
  {
    network: $networkStore,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    transferDirections: xcmTransferModel.$transferDirections,
  },
  ({ network, chains, statuses, transferDirections }) => {
    if (!network || !transferDirections) return [];

    const xcmChains = transferDirections.reduce<Chain[]>((acc, chain) => {
      const chainId = `0x${chain.destination.chainId}` as ChainId;

      if (statuses[chainId] && networkUtils.isConnectedStatus(statuses[chainId])) {
        acc.push(chains[chainId]);
      }

      return acc;
    }, []);

    return [network.chain].concat(xcmChains);
  },
);

const $destinationAccounts = combine(
  {
    isXcm: $isXcm,
    wallet: walletModel.$activeWallet,
    chain: $transferForm.fields.xcmChain.$value,
  },
  ({ isXcm, wallet, chain }) => {
    if (!isXcm || !wallet || !chain.chainId) return [];

    return walletUtils.getAccountsBy([wallet], (a, w) => {
      const isBase = accountUtils.isVaultBaseAccount(a);
      const isPolkadotVault = walletUtils.isPolkadotVault(w);

      return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
    });
  },
);

const $isMyselfXcmEnabled = combine(
  {
    isXcm: $isXcm,
    destinationAccounts: $destinationAccounts,
  },
  ({ isXcm, destinationAccounts }) => {
    return isXcm && destinationAccounts.length > 0;
  },
);

const $canSubmit = combine(
  {
    isXcm: $isXcm,
    isFormValid: $transferForm.$isValid,
    isFeeLoading: $isFeeLoading,
    isXcmFeeLoading: xcmTransferModel.$isXcmFeeLoading,
  },
  ({ isXcm, isFormValid, isFeeLoading, isXcmFeeLoading }) => {
    return isFormValid && !isFeeLoading && (!isXcm || !isXcmFeeLoading);
  },
);

const $extrinsic = combine(
  {
    api: $api,
    coreTx: $coreTx,
  },
  ({ api, coreTx }) => {
    if (!api || !coreTx) return null;

    return getExtrinsic[coreTx.type](coreTx.args, api);
  },
);

const $xcmChain = combine(
  {
    chains: networkModel.$chains,
    xcmChainId: xcmTransferModel.$xcmChainId,
  },
  ({ chains, xcmChainId }) => {
    if (!xcmChainId) return null;

    return chains[xcmChainId] ?? null;
  },
);

const getDeliveryFeeFx = createEffect(
  async ({
    config,
    parachainId,
    api,
    extrinsic,
    destinationChain,
  }: {
    config: XcmConfig | null;
    parachainId: number | null;
    api: ApiPromise | null;
    extrinsic?: SubmittableExtrinsic<'promise'> | null;
    destinationChain: Chain | null;
  }) => {
    if (config && api && parachainId && extrinsic && destinationChain) {
      return xcmService.getDeliveryFeeFromConfig({
        config,
        originChain: toLocalChainId(api.genesisHash.toHex()) || '',
        originApi: api,
        destinationChainId: parachainId,
        extrinsic,
        destinationChain,
      });
    } else {
      return BN_ZERO;
    }
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: [$transferForm.reset, xcmTransferModel.events.xcmStarted, $selectedSignatories.reinit],
});

sample({
  clock: formInitiated,
  fn: ({ chain, asset }) => getAssetId(chain.assets[0]) === getAssetId(asset),
  target: $isNative,
});

sample({
  clock: formInitiated,
  filter: ({ chain, asset }) => Boolean(chain) && Boolean(asset),
  fn: ({ chain }) => chain,
  target: $transferForm.fields.xcmChain.onChange,
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
  clock: formInitiated,
  source: $accounts,
  filter: (accounts) => accounts.length > 0,
  fn: (accounts) => accounts[0].account,
  target: $transferForm.fields.account.onChange,
});

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, xcmChain) => chain.chainId !== xcmChain.chainId,
  target: $isXcm,
});

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  target: $transferForm.fields.destination.reset,
});

sample({
  clock: $transferForm.fields.account.onChange,
  source: $accounts,
  fn: (accounts, account) => {
    const id = networkDomain.accountsService.uniqId(account);
    const match = accounts.find((a) => networkDomain.accountsService.uniqId(a.account) === id);

    return match?.balances || { balance: ZERO_BALANCE, native: ZERO_BALANCE };
  },
  target: $accountBalance,
});

sample({
  source: {
    isProxy: $isProxy,
    isNative: $isNative,
    balances: balanceModel.$balances,
    network: $networkStore,
    proxyAccount: $realAccount,
  },
  filter: ({ isProxy, network }) => isProxy && Boolean(network),
  fn: ({ isNative, balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network!.chain.chainId,
      network!.asset.assetId.toString(),
    );

    let nativeBalance = balance;
    if (!isNative) {
      nativeBalance = balanceUtils.getBalance(
        balances,
        proxyAccount.accountId,
        network!.chain.chainId,
        network!.chain.assets[0].assetId.toString(),
      );
    }

    return { balance: transferableAmount(balance), native: transferableAmount(nativeBalance) };
  },
  target: $proxyBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  source: $signatories,
  filter: (signatories, signatory) => {
    return !isEmpty(signatories) && nonNullable(signatory);
  },
  fn: (signatories, signatory) => {
    if (!signatory) {
      return ZERO_BALANCE;
    }

    const id = networkDomain.accountsService.uniqId(signatory);
    const match = signatories[0].find(({ signer }) => networkDomain.accountsService.uniqId(signer) === id);

    return match?.balance || ZERO_BALANCE;
  },
  target: $signatoryBalance,
});

sample({
  clock: $transferForm.fields.signatory.$value,
  filter: (signatory: Account | null): signatory is Account => nonNullable(signatory),
  fn: (signatory) => [signatory],
  target: $selectedSignatories,
});

sample({
  clock: myselfClicked,
  source: {
    xcmChain: $transferForm.fields.xcmChain.$value,
    destinationAccounts: $destinationAccounts,
  },
  filter: ({ xcmChain, destinationAccounts }) => {
    return Boolean(xcmChain.chainId) && destinationAccounts.length === 1;
  },
  fn: ({ xcmChain, destinationAccounts }) => {
    return toAddress(destinationAccounts[0].accountId, { prefix: xcmChain.addressPrefix });
  },
  target: $transferForm.fields.destination.onChange,
});

sample({
  clock: myselfClicked,
  source: $destinationAccounts,
  filter: (destinationAccounts) => destinationAccounts.length > 1,
  fn: () => true,
  target: $isMyselfXcmOpened,
});

sample({
  clock: xcmDestinationSelected,
  source: $transferForm.fields.xcmChain.$value,
  filter: (xcmChain) => Boolean(xcmChain.chainId),
  fn: ({ addressPrefix }, accountId) => ({
    canSelect: false,
    destination: toAddress(accountId, { prefix: addressPrefix }),
  }),
  target: spread({
    canSelect: $isMyselfXcmOpened,
    destination: $transferForm.fields.destination.onChange,
  }),
});

// XCM model Bindings

sample({
  clock: $transferForm.fields.xcmChain.onChange,
  fn: (chain) => chain.chainId,
  target: xcmTransferModel.events.xcmChainSelected,
});

sample({
  clock: $transferForm.fields.destination.onChange,
  fn: toAccountId,
  target: xcmTransferModel.events.destinationChanged,
});

sample({
  clock: $transferForm.fields.amount.onChange,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ asset }, amount) => formatAmount(amount, asset.precision),
  target: xcmTransferModel.events.amountChanged,
});

// Submit

sample({
  clock: $transferForm.formValidated,
  source: {
    realAccount: $realAccount,
    network: $networkStore,
    transaction: $transaction,
    isProxy: $isProxy,
    fee: $fee,
    xcmFee: xcmTransferModel.$xcmFee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction }) => {
    return Boolean(network) && Boolean(transaction);
  },
  fn: ({ realAccount, network, transaction, isProxy, ...fee }, formData) => {
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      transactions: {
        wrappedTx: transaction!.wrappedTx,
        multisigTx: transaction!.multisigTx,
        coreTx: transaction!.coreTx,
      },
      formData: {
        ...fee,
        ...formData,
        amount,
        account: realAccount,
        ...(isProxy && { proxiedAccount: formData.account as ProxiedAccount }),
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: $extrinsic,
  source: {
    api: $api,
    parachainId: xcmTransferModel.$xcmParaId,
    config: xcmTransferModel.$config,
    extrinsic: $extrinsic,
    destinationChain: $xcmChain,
  },
  target: getDeliveryFeeFx,
});

sample({
  clock: getDeliveryFeeFx.doneData,
  target: $deliveryFee,
});

sample({
  clock: getDeliveryFeeFx.fail,
  fn: () => BN_ZERO,
  target: $deliveryFee,
});

export const formModel = {
  $transferForm,
  $proxyWallet,
  $signatories,
  $txWrappers,

  $destinationAccounts,
  $isMyselfXcmEnabled,
  $isMyselfXcmOpened,

  $accounts,
  $chains,
  $accountBalance,
  $proxyBalance,

  $fee,
  $multisigDeposit,
  $deliveryFee,

  $coreTx,
  $fakeTx,
  $api,
  $networkStore,
  $transaction,
  $isMultisig,
  $isXcm,
  $isChainConnected,
  $canSubmit,

  $xcmConfig: xcmTransferModel.$config,
  $xcmApi: xcmTransferModel.$apiDestination,

  events: {
    formInitiated,
    formCleared: $transferForm.reset,

    myselfClicked,
    xcmDestinationSelected,
    xcmDestinationCancelled,

    feeChanged,
    multisigDepositChanged,
    isFeeLoadingChanged,
    isXcmFeeLoadingChanged: xcmTransferModel.events.isXcmFeeLoadingChanged,
    xcmFeeChanged: xcmTransferModel.events.xcmFeeChanged,
  },

  output: {
    formSubmitted,
  },
};
