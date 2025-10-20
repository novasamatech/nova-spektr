/* eslint-disable import-x/max-dependencies */
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { and, debounce, not, or, spread } from 'patronum';

import { type Address, type Asset, type Chain, type ChainId, type Transaction } from '@/shared/core';
import { createSubscription } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import {
  TEST_ADDRESS,
  TEST_EVM_ADDRESS,
  assert,
  formatAmount,
  getAssetId,
  getNativeAsset,
  nonNullable,
  nullable,
  toAccountId,
  toAddress,
  toAssetPrecision,
  toPrecision,
  totalAmountBN,
  validateAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  combineTotalRequiredFee,
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { transferValidator } from '@/features/operations/OperationsValidation';
import { getAvailableAmount } from '../../shared/services/getAvailableAmount';
import { type NetworkStore } from '../lib/types';

import { xcmTransferModel } from './xcm-transfer-model';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  destination: string;
  destinationChain: Chain | null;
  amount: string;
};

type FormSubmitEvent = FormParams & {
  coreTx: Transaction;
  tx: Transaction;
  initiator: AnyAccount;
  signatory: AnyAccount;
  destination: Address;
  route: AnyAccount[];
  destinationChain: Chain;
  fee: BN;
  xcmFee: BN;
  deliveryFee: BN;
  multisigDeposit: BN;
  rawAmount: string;
  includeExistentialDeposit: boolean;
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const multisigDepositChanged = createEvent<BN>();

const myselfClicked = createEvent();
const xcmDestinationSelected = createEvent<AccountId>();
const xcmDestinationCancelled = createEvent();

const $available = createStore<BN | null>(null).reset(formInitiated);
const setAvailable = createEvent<BN>();

sample({
  clock: setAvailable,
  source: $available,
  filter: (state, update) => !state || !state.eq(update),
  fn: (_, newValue) => newValue,
  target: $available,
});

const setMaxMode = createEvent<boolean>();
const $isMaxModeEnabled = createStore(false)
  .on(setMaxMode, (_, update) => update)
  .reset(formInitiated);

const toggleExistentialDeposit = createEvent();
const $isExistentialDepositEnabled = createStore(false)
  .on(toggleExistentialDeposit, (state, update) => {
    if (nonNullable(update)) {
      return update;
    } else {
      return !state;
    }
  })
  .reset(formInitiated);

const $isEdSwitchVisible = createStore(false)
  .on(setMaxMode.filter({ fn: (value) => value }), () => true)
  .reset(formInitiated);

const $networkStore = restore(formInitiated, null);
const $isNative = createStore<boolean>(false);

const $isMyselfXcmOpened = createStore<boolean>(false).reset(xcmDestinationCancelled);

const $multisigDeposit = restore(multisigDepositChanged, BN_ZERO);

const $chain = $networkStore.map((s) => (s ? s.chain : null));
const $nativeAsset = $chain.map((c) => (c ? getNativeAsset(c.assets) : null));
const $asset = $networkStore.map((s) => (s ? s.asset : null));

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
    },
    destinationChain: {
      defaultValue: null,
    },
    destination: {
      defaultValue: '',
      validator() {
        return (destination, { destinationChain }) => {
          if (!validateAddress(destination)) {
            return { message: 'transfer.destinationFormatError' };
          }

          if (nullable(destinationChain)) return;
          if (!validateAddress(destination, destinationChain)) {
            return { message: 'transfer.destinationCryptoError', values: { network: destinationChain.name } };
          }
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => ({
        source: $asset,
        fn: (amount, _, asset: Asset | null) => {
          if (nullable(asset)) return;

          const bn = toPrecision(amount, asset.precision);
          if (bn.isZero()) {
            return { message: 'transfer.requiredAmountError' };
          }
        },
      }),
    },
  },
  validateOn: ['submit'],
});

const $destination = form.fields.destination.$value;
const $destinationChain = form.fields.destinationChain.$value;

const $amount = combine($asset, form.fields.amount.$value, (asset, amount) => {
  if (nullable(asset)) return BN_ZERO;
  return toPrecision(amount, asset.precision);
});

// Computed

const $isXcm = combine(
  {
    source: $chain,
    destination: $destinationChain,
  },
  ({ source, destination }) => {
    return nonNullable(source) && nonNullable(destination) && source.chainId !== destination.chainId;
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

// initiator

const $initiators = createInitiatorsStore({
  chain: $chain,
  accounts: walletSelect.$selectedAccounts,
});

// signatories

const $signatories = createSignatoriesStore({
  chain: $chain,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balanceMap,
    chain: $chain,
  },
  ({ signatory, balances, chain }) => {
    if (nullable(signatory) || nullable(chain)) {
      return BN_ZERO;
    }

    const asset = getNativeAsset(chain.assets);
    const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);
    return balance ? withdrawableAmountBN(balance) : BN_ZERO;
  },
);

const $initiatorAccountBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
    chain: $chain,
    asset: $asset,
  },
  ({ initiator, asset, chain, balances }) => {
    if (nullable(initiator) || nullable(chain) || nullable(asset)) {
      return null;
    }

    return balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
  },
);

// destination account

const $destinationAccountId = combine($destination, $destinationChain, (destination, chain) => {
  if (nullable(chain)) return null;
  return validateAddress(destination, chain) ? toAccountId(destination) : null;
});

const $destinationBalance = combine(
  {
    balances: balanceModel.$balanceMap,
    accountId: $destinationAccountId,
    chain: $destinationChain,
    asset: $asset,
  },
  ({ balances, accountId, chain, asset }) => {
    if (nullable(accountId) || nullable(chain) || nullable(asset)) {
      return null;
    }

    return balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);
  },
);

const $destinationBalanceEd = $destinationBalance.map((b) => b?.ed ?? BN_ZERO);

const $hasDestinationBalanceError = combine(
  { amount: $amount, accountId: $destinationAccountId, balance: $destinationBalance },
  ({ amount, accountId, balance }) => {
    if (nullable(balance)) {
      return nonNullable(accountId);
    }
    if (amount.isZero()) return false;

    const total = totalAmountBN(balance);
    return total.lt(balance.ed) && amount.lt(balance.ed);
  },
);

const $destinationBalanceSubscriptionSource = combine({
  chain: $destinationChain,
  accountId: $destinationAccountId,
});

createSubscription({
  params: $destinationBalanceSubscriptionSource,
  subscribe: balanceSubModel.subscribeAccounts.prepend((a: { accountId: AccountId; chain: Chain }) => [a]),
  unsubscribe: balanceSubModel.unsubscribeAccounts.prepend((a: { accountId: AccountId; chain: Chain }) => [a]),
});

// transaction

const $coreTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    form: form.$values,
    xcmData: xcmTransferModel.$xcmData,
    isConnected: $isChainConnected,
    initiator: form.fields.initiator.$value,
    isExistentialDepositEnabled: $isExistentialDepositEnabled,
    isMaxModeEnabled: $isMaxModeEnabled,
  },
  ({ network, isXcm, form, xcmData, isConnected, initiator, isExistentialDepositEnabled, isMaxModeEnabled }) => {
    if (!network || !initiator || !isConnected || (isXcm && !xcmData) || !validateAddress(form.destination)) {
      return null;
    }

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: initiator.accountId,
      amount: form.amount,
      destination: form.destination,
      xcmData,
      transferAll: isMaxModeEnabled && isExistentialDepositEnabled,
      allowDeath: !isMaxModeEnabled && isExistentialDepositEnabled,
    });
  },
);

const $feeCoreTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    xcmData: xcmTransferModel.$xcmData,
    xcmChain: xcmTransferModel.$xcmChain,
    isConnected: $isChainConnected,
    initiator: form.fields.initiator.$value,
  },
  ({ network, isXcm, xcmChain, xcmData, isConnected, initiator }) => {
    if (!network || !initiator || !isConnected || (isXcm && !xcmData)) {
      return null;
    }

    const destinationChain = isXcm ? xcmChain : network.chain;
    const destination = networkUtils.isEthereumBased(destinationChain?.options) ? TEST_EVM_ADDRESS : TEST_ADDRESS;

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: initiator.accountId,
      amount: '1',
      destination,
      xcmData,
    });
  },
);

const { $fee, $pendingFee, $tx, $feeTx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
  feeTransaction: $feeCoreTx,
});

const $calculationTx = combine({ coreTx: $tx, feeTx: $feeTx }, ({ coreTx, feeTx }) => coreTx ?? feeTx ?? null);

const $calculationExtrinsic = combine(
  {
    api: $api,
    tx: $calculationTx,
  },
  ({ api, tx }) => {
    if (!api || !tx) return null;
    return getExtrinsic[tx.type](tx.args, api);
  },
);

const {
  $errors: $errorsImmediate,
  $valid,
  $balanceValidationResults,
  $validationDone,
  $pending: $validationPending,
} = createTxValidationStore({
  validator: transferValidator,
  params: {
    api: $api,
    sourceChain: $chain,
    sourceAsset: $asset,
    destinationChain: $destinationChain,
    asset: $nativeAsset,
    amount: $amount,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $calculationTx,
    xcmFee: xcmTransferModel.$xcmFee,
    deliveryFee: xcmTransferModel.$deliveryFee,
    includeExistentialDeposit: $isExistentialDepositEnabled,
  },
});

const errorsDebounced = debounce({
  source: $errorsImmediate,
  timeout: 300,
});

const $errors = createStore($errorsImmediate.defaultState).reset(formInitiated);

sample({
  clock: errorsDebounced,
  source: $validationPending,
  filter: (pending) => !pending,
  fn: (_, errors) => errors,
  target: $errors,
});

const $totalFee = combine(
  {
    validationDone: $validationDone,
    validationResults: $balanceValidationResults,
    asset: $asset,
    initiator: form.fields.initiator.$value,
  },
  ({ validationResults, asset, initiator, validationDone }) => {
    if (!validationDone || nullable(asset) || nullable(initiator)) {
      return null;
    }

    return combineTotalRequiredFee({
      validationResults,
      account: initiator,
      assetId: asset.assetId,
      excludeActions: ['sending amount'],
    });
  },
);

sample({
  source: {
    balance: $initiatorAccountBalance,
    totalFee: $totalFee,
    isExistentialDepositEnabled: $isExistentialDepositEnabled,
  },
  filter: ({ balance, totalFee }) => nonNullable(balance) && nonNullable(totalFee),
  fn: ({ balance, totalFee, isExistentialDepositEnabled }) => {
    return getAvailableAmount({ balance: balance!, totalFee: totalFee!, includeED: isExistentialDepositEnabled });
  },
  target: setAvailable,
});

const $accountDeathImmediate = $balanceValidationResults.map((results) =>
  results.some((item) => item.balance.burned.gt(BN_ZERO)),
);

const accountDeathDebounced = debounce({
  source: $accountDeathImmediate,
  timeout: 300,
});

const $accountDeath = createStore(false).reset(formInitiated);

sample({
  clock: accountDeathDebounced,
  source: $validationPending,
  filter: (pending) => !pending,
  fn: (_, accountDeath) => accountDeath,
  target: $accountDeath,
});

const $showEDSwitch = combine($isEdSwitchVisible, $initiatorAccountBalance, (isEdSwitchVisible, balance) => {
  if (!isEdSwitchVisible || nullable(balance)) {
    return false;
  }
  const locked = BN.max(balance.frozen, balance.reserved);
  return balance.ed.gt(locked);
});

const $proxyAccount = $route.map((route) => route.find(accountUtils.isProxiedAccount) ?? null);
const $isMultisigAccount = $route.map((route) => route.find(accountUtils.isAnyMultisigAccount) ?? null);

const $destinationChains = combine(
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
    accounts: walletSelect.$selectedAccounts,
    chain: $destinationChain,
  },
  ({ isXcm, accounts, chain }) => {
    if (!isXcm || !chain) return [];
    return accountService.filterAccountsOnChain(accounts, chain);
  },
);

const $isMyselfXcmEnabled = combine(
  {
    isXcm: $isXcm,
    destinationAccounts: $destinationAccounts,
  },
  ({ isXcm, destinationAccounts }) => isXcm && destinationAccounts.length > 0,
);

const $canSubmit = and(
  form.$isValid,
  $valid,
  not($hasDestinationBalanceError),
  or(not($isXcm), not(xcmTransferModel.$isXcmFeeLoading), not(xcmTransferModel.$isDeliveryFeeLoading)),
);

// Fields connections

sample({
  clock: formInitiated,
  target: [form.reset, xcmTransferModel.events.xcmStarted],
});

sample({
  clock: formInitiated,
  fn: ({ chain, asset }) => getAssetId(getNativeAsset(chain.assets)!) === getAssetId(asset),
  target: $isNative,
});

sample({
  clock: formInitiated,
  filter: ({ chain, asset }) => Boolean(chain) && Boolean(asset),
  fn: ({ chain }) => chain,
  target: form.fields.destinationChain.change,
});

sample({
  clock: formInitiated,
  source: $initiators,
  fn: (initiators) => initiators.at(0) ?? null,
  target: form.fields.initiator.change,
});

sample({
  clock: [$signatories, formInitiated],
  source: $signatories,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: form.fields.destinationChain.change,
  target: form.fields.destination.reset,
});

sample({
  clock: myselfClicked,
  source: {
    xcmChain: $destinationChain,
    destinationAccounts: $destinationAccounts,
  },
  filter: ({ xcmChain, destinationAccounts }) => {
    return nonNullable(xcmChain) && destinationAccounts.length === 1;
  },
  fn: ({ xcmChain, destinationAccounts }) => {
    const account = destinationAccounts.at(0);
    assert(account, 'destination account not found');

    return toAddress(account.accountId, { prefix: xcmChain?.addressPrefix });
  },
  target: form.fields.destination.change,
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
  source: $destinationChain,
  filter: nonNullable,
  fn: (xcmChain, accountId) => ({
    canSelect: false,
    destination: toAddress(accountId, { prefix: xcmChain?.addressPrefix }),
  }),
  target: spread({
    canSelect: $isMyselfXcmOpened,
    destination: form.fields.destination.change,
  }),
});

// XCM model Bindings

sample({
  clock: form.fields.destinationChain.change.filter({ fn: nonNullable }),
  fn: (chain) => chain.chainId,
  target: xcmTransferModel.events.xcmChainSelected,
});

sample({
  clock: form.fields.destination.change,
  fn: (destination) => (validateAddress(destination) ? toAccountId(destination) : null),
  target: xcmTransferModel.events.destinationChanged,
});

sample({
  clock: form.fields.amount.change,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ asset }, amount) => formatAmount(amount, asset.precision),
  target: xcmTransferModel.events.amountChanged,
});

// Max Mode: update amount field when max mode is enabled and available balance changes
sample({
  clock: [$available, setMaxMode.filter({ fn: (enabled) => enabled })],
  source: {
    isMaxModeEnabled: $isMaxModeEnabled,
    available: $available,
    network: $networkStore,
  },
  filter: ({ isMaxModeEnabled, available, network }) =>
    isMaxModeEnabled && nonNullable(available) && nonNullable(network),
  fn: ({ available, network }) => toAssetPrecision(available!, network!.asset.precision),
  target: form.fields.amount.change,
});

// Submit

const formSubmitFinished = sample({
  clock: form.submit.doneData,
  source: {
    chain: $chain,
    initiator: form.fields.initiator.$value,
    network: $networkStore,
    route: $route,
    coreTx: $coreTx,
    tx: $tx,
    fee: $fee,
    xcmFee: xcmTransferModel.$xcmFee,
    deliveryFee: xcmTransferModel.$deliveryFee,
    multisigDeposit: $multisigDeposit,
    isExistentialDepositEnabled: $isExistentialDepositEnabled,
  },
  fn: (
    {
      chain,
      initiator,
      network,
      route,
      coreTx,
      tx,
      multisigDeposit,
      fee,
      xcmFee,
      deliveryFee,
      isExistentialDepositEnabled,
    },
    form,
  ) => {
    if (
      nullable(chain) ||
      nullable(coreTx) ||
      nullable(tx) ||
      nullable(initiator) ||
      nullable(form.signatory) ||
      !validateAddress(form.destination)
    ) {
      return null;
    }
    return {
      tx,
      coreTx,
      initiator: initiator,
      signatory: form.signatory,
      amount: formatAmount(form.amount, network!.asset.precision),
      rawAmount: form.amount,
      destination: form.destination,
      destinationChain: form.destinationChain ?? chain,
      multisigDeposit,
      route,
      fee,
      xcmFee,
      deliveryFee: deliveryFee,
      includeExistentialDeposit: isExistentialDepositEnabled,
    } satisfies FormSubmitEvent;
  },
});

sample({
  clock: formSubmitFinished.filter({ fn: nonNullable }),
  target: formSubmitted,
});

sample({
  clock: $calculationExtrinsic,
  filter: nonNullable,
  target: xcmTransferModel.events.deliveryFeeRequested,
});

export const formModel = {
  form,

  $initiators,
  $signatories,

  $available,
  $initiatorAccountBalance,
  $signatoryBalance,

  $proxyAccount,
  $multisigAccount: $isMultisigAccount,

  $isMyselfXcmEnabled,
  $isMyselfXcmOpened,

  $destinationAccounts,
  $destinationChains,
  $destinationBalanceEd,
  $hasDestinationBalanceError,

  $fee,
  $pendingFee,
  $multisigDeposit,
  $xcmFee: xcmTransferModel.$xcmFee,
  $deliveryFee: xcmTransferModel.$deliveryFee,

  $coreTx,
  $tx,
  $api,
  $networkStore,
  $isXcm,
  $isChainConnected,
  $canSubmit,
  $asset,

  $errors,

  $xcmConfig: xcmTransferModel.$config,
  $xcmApi: xcmTransferModel.$apiDestination,

  $isExistentialDepositEnabled,
  $isMaxModeEnabled,
  $showEDSwitch,
  $accountDeath,
  $isNative,

  formInitiated,
  formCleared: form.reset,

  myselfClicked,
  xcmDestinationSelected,
  xcmDestinationCancelled,

  multisigDepositChanged,
  isXcmFeeLoadingChanged: xcmTransferModel.events.isXcmFeeLoadingChanged,
  xcmFeeChanged: xcmTransferModel.events.xcmFeeChanged,

  formSubmitted,

  events: {
    toggleExistentialDeposit,
    toggleMaxMode: setMaxMode,
  },
};
