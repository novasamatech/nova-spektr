/* eslint-disable import-x/max-dependencies */
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { and, debounce, not, or, spread } from 'patronum';

import { spellXcmService } from '@/shared/api/xcm';
import { type Address, type Asset, type Chain, type Transaction } from '@/shared/core';
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
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, type BalancePreservation, accountService, accounts, balanceService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { transferValidator } from '@/features/operations/OperationsValidation';
import { type NetworkStore } from '../lib/types';

import { xcmSpellTransferModel } from './xcm-spell-transfer-model';

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
  destinationFee: BN | null;
  multisigDeposit: BN;
  rawAmount: string;
  balancePreservation: BalancePreservation;
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const multisigDepositChanged = createEvent<BN>();

const myselfClicked = createEvent();
const xcmDestinationSelected = createEvent<AccountId>();
const xcmDestinationCancelled = createEvent();

const setAvailable = createEvent<BN | null>();
const $available = createStore<BN | null>(null)
  .on(setAvailable, (state, payload) => (!state || !payload || !state.eq(payload) ? payload : state))
  .reset(formInitiated);

const setMaxMode = createEvent<boolean>();
const $isMaxModeEnabled = createStore(false)
  .on(setMaxMode, (_, update) => update)
  .reset(formInitiated);
const $inputMode = $isMaxModeEnabled.map((isMaxModeEnabled) => (isMaxModeEnabled ? 'max' : 'regular'));

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
  validateOn: ['change'],
});

const $destination = form.fields.destination.$value;
const $destinationChain = form.fields.destinationChain.$value;

const $amount = combine($asset, form.fields.amount.$value, (asset, amount) => {
  if (nullable(asset)) return null;

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
      return null;
    }

    const asset = getNativeAsset(chain.assets);
    const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);

    return balance ? withdrawableAmountBN(balance) : null;
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

const $destinationAsset = combine(
  {
    chain: $destinationChain,
    sourceAsset: $asset,
    isXcm: $isXcm,
    transferDirection: xcmSpellTransferModel.$transferDirection,
  },
  ({ chain, sourceAsset, isXcm, transferDirection }) => {
    if (isXcm) {
      return chain?.assets.find((a) => a.assetId === transferDirection?.destination.assetId) ?? null;
    } else {
      return sourceAsset;
    }
  },
);

const $destinationBalance = combine(
  {
    balances: balanceModel.$balanceMap,
    accountId: $destinationAccountId,
    chain: $destinationChain,
    asset: $destinationAsset,
  },
  ({ balances, accountId, chain, asset }) => {
    if (nullable(accountId) || nullable(chain) || nullable(asset)) {
      return null;
    }

    return balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);
  },
);

const $destinationBalanceEd = $destinationBalance.map((b) => b?.ed ?? null);

const $hasDestinationBalanceError = combine(
  { amount: $amount, accountId: $destinationAccountId, balance: $destinationBalance },
  ({ amount, accountId, balance }) => {
    if (nullable(accountId) || nullable(balance) || nullable(amount)) {
      return false;
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

// balance preservation strategy

const toggleExistentialDeposit = createEvent<boolean | null>();
const $isExistentialDepositEnabled = createStore(false)
  .on(toggleExistentialDeposit, (state, update) => {
    if (nonNullable(update)) {
      return update;
    } else {
      return !state;
    }
  })
  .reset(formInitiated);

sample({
  clock: $isXcm,
  filter: (isXcm) => isXcm,
  fn: () => false,
  target: toggleExistentialDeposit,
});

const $balancePreservationStrategy = $isExistentialDepositEnabled.map<BalancePreservation>((v) =>
  v ? 'allowDeath' : 'keepAlive',
);

// transaction

const $coreTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    formValues: form.$values,
    isFormValid: form.$isValid,
    xcmData: xcmSpellTransferModel.$xcmData,
    isConnected: $isChainConnected,
    initiator: form.fields.initiator.$value,
    inputMode: $inputMode,
    balancePreservation: $balancePreservationStrategy,
  },
  ({ isFormValid, network, isXcm, formValues, xcmData, isConnected, initiator, inputMode, balancePreservation }) => {
    if (!isFormValid || !network || !initiator || !isConnected || !validateAddress(formValues.destination)) {
      return null;
    }

    if (isXcm && !xcmData) {
      return null;
    }

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: initiator.accountId,
      amount: formValues.amount,
      destination: formValues.destination,
      xcmData: isXcm ? xcmData : undefined,
      balancePreservation,
      inputMode,
    });
  },
);

const $mockDestination = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    xcmChain: xcmSpellTransferModel.$xcmChain,
  },
  ({ isXcm, xcmChain, network }) => {
    if (nullable(network)) {
      return null;
    }
    const destinationChain = isXcm ? xcmChain : network.chain;
    return networkUtils.isEthereumBased(destinationChain?.options) ? TEST_EVM_ADDRESS : TEST_ADDRESS;
  },
);

const $feeCoreTx = combine(
  {
    network: $networkStore,
    isXcm: $isXcm,
    xcmData: xcmSpellTransferModel.$xcmData,
    isConnected: $isChainConnected,
    initiator: form.fields.initiator.$value,
    mockDestination: $mockDestination,
    inputMode: $inputMode,
    balancePreservation: $balancePreservationStrategy,
  },
  ({ network, isXcm, xcmData, isConnected, initiator, mockDestination, inputMode, balancePreservation }) => {
    if (nullable(network) || nullable(initiator) || nullable(isConnected) || nullable(mockDestination) || isXcm) {
      return null;
    }

    return transactionBuilder.buildTransfer({
      chain: network.chain,
      asset: network.asset,
      accountId: initiator.accountId,
      amount: '1',
      destination: mockDestination,
      xcmData: isXcm ? xcmData : undefined,
      inputMode,
      balancePreservation,
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

const $networkFee = combine(
  {
    isXcm: $isXcm,
    originFee: xcmSpellTransferModel.$originFee,
    regularFee: $fee,
  },
  ({ isXcm, originFee, regularFee }) => {
    if (isXcm) {
      return originFee;
    }
    return regularFee;
  },
);

const $networkFeePending = combine(
  {
    isXcm: $isXcm,
    xcmFeeLoading: xcmSpellTransferModel.$isDestinationFeeLoading,
    regularFeePending: $pendingFee,
  },
  ({ isXcm, xcmFeeLoading, regularFeePending }) => {
    if (isXcm) {
      return xcmFeeLoading;
    }
    return regularFeePending;
  },
);

const $calculationTx = combine({ coreTx: $tx, feeTx: $feeTx }, ({ coreTx, feeTx }) => coreTx ?? feeTx ?? null);

// validation

const {
  $errors: $errorsImmediate,
  $valid,
  $balanceValidationResults,
  $pending: $validationPending,
  $available: $availableBalances,
} = createTxValidationStore({
  validator: transferValidator,
  calculateAvailable: {
    exclude: ['sending amount'],
  },
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
    originFee: combine(
      {
        isXcm: $isXcm,
        originFee: xcmSpellTransferModel.$originFee,
      },
      ({ isXcm, originFee }) => {
        // For regular transfers, use BN_ZERO so XCM validation rules don't apply
        return isXcm ? (originFee ?? BN_ZERO) : BN_ZERO;
      },
    ),
    destinationFee: combine(
      {
        isXcm: $isXcm,
        destinationFee: xcmSpellTransferModel.$destinationFee,
      },
      ({ isXcm, destinationFee }) => {
        // For regular transfers, use BN_ZERO so XCM validation rules don't apply
        return isXcm ? (destinationFee ?? BN_ZERO) : BN_ZERO;
      },
    ),
    balancePreservation: $balancePreservationStrategy,
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

// available balance

const $availableBalance = combine(
  {
    availableBalances: $availableBalances,
    balance: $initiatorAccountBalance,
  },
  ({ availableBalances, balance }) => {
    if (nullable(balance)) return null;
    return availableBalances.find((b) => b.id === balance.id) ?? balance;
  },
);

sample({
  source: {
    balance: $availableBalance,
    balancePreservationStrategy: $balancePreservationStrategy,
  },
  fn: ({ balance, balancePreservationStrategy }) => {
    if (nullable(balance)) return null;

    return balanceService.withdrawableAmount(balance, balancePreservationStrategy);
  },
  target: setAvailable,
});

const $burnedAmount = $balanceValidationResults.map((results) =>
  results.reduce((acc, item) => acc.add(item.balance.burned), BN_ZERO),
);

const $showAccountDeathAlert = createStore(false).reset(formInitiated);

sample({
  clock: debounce({
    source: $burnedAmount.map((burnedAmount) => burnedAmount.gtn(0)),
    timeout: 300,
  }),
  source: $validationPending,
  filter: (pending) => !pending,
  fn: (_, accountDeath) => accountDeath,
  target: $showAccountDeathAlert,
});

const $showEDSwitch = combine(
  { isEdSwitchVisible: $isEdSwitchVisible, availableBalance: $availableBalance, isXcm: $isXcm },
  ({ isEdSwitchVisible, availableBalance, isXcm }) => {
    if (isXcm) return false;
    if (!isEdSwitchVisible) return false;
    if (nullable(availableBalance)) return false;

    const keepAliveAvailable = balanceService.withdrawableAmount(availableBalance, 'keepAlive');
    const allowDeathAvailable = balanceService.withdrawableAmount(availableBalance, 'allowDeath');

    return !allowDeathAvailable.eq(keepAliveAvailable);
  },
);

const $proxyAccount = $route.map((route) => route.find(accountUtils.isProxiedAccount) ?? null);
const $multisigAccount = $route.map((route) => route.find(accountUtils.isAnyMultisigAccount) ?? null);

const $destinationChains = combine(
  {
    network: $networkStore,
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    transferDirections: xcmSpellTransferModel.$transferDirections,
  },
  ({ network, chains, statuses, transferDirections }) => {
    if (!network || !transferDirections) return [];

    const xcmChains = transferDirections
      .map((chainName) => {
        const chain = Object.values(chains).find((chain) => {
          const spellName = spellXcmService.getSpellChainName(chain);
          return spellName === chainName;
        });
        return chain;
      })
      .filter((chain): chain is Chain => {
        if (!chain) return false;
        const spellName = spellXcmService.getSpellChainName(chain);
        if (!spellName) return false;
        const chainId = chain.chainId;
        return statuses[chainId] && networkUtils.isConnectedStatus(statuses[chainId]);
      });

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

const $hasDryRunError = xcmSpellTransferModel.$dryRunError.map((error) => error !== null);

const $canSubmit = and(
  $valid,
  not($hasDestinationBalanceError),
  or(not($isXcm), not(xcmSpellTransferModel.$isDestinationFeeLoading)),
  not($hasDryRunError),
);

// Fields connections

sample({
  clock: formInitiated,
  target: [form.reset, xcmSpellTransferModel.events.xcmStarted, xcmSpellTransferModel.events.xcmStopped],
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
  target: xcmSpellTransferModel.events.xcmChainSelected,
});

sample({
  clock: [form.fields.destination.change, $mockDestination],
  source: {
    destination: form.fields.destination.$value,
    mockDestination: $mockDestination,
  },
  fn: ({ destination, mockDestination }) => {
    const address = destination || mockDestination;

    if (nullable(address)) return null;
    return validateAddress(address) ? toAccountId(address) : null;
  },
  target: xcmSpellTransferModel.events.destinationChanged,
});

sample({
  clock: form.fields.amount.change,
  target: xcmSpellTransferModel.events.rawAmountChanged,
});

sample({
  clock: form.fields.initiator.change,
  fn: (initiator) => initiator?.accountId ?? null,
  target: xcmSpellTransferModel.events.initiatorAccountIdChanged,
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
    isXcm: $isXcm,
    originFee: xcmSpellTransferModel.$originFee,
    destinationFee: xcmSpellTransferModel.$destinationFee,
    multisigDeposit: $multisigDeposit,
    balancePreservation: $balancePreservationStrategy,
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
      isXcm,
      originFee,
      destinationFee,
      balancePreservation,
    },
    form,
  ) => {
    if (
      nullable(chain) ||
      nullable(coreTx) ||
      nullable(tx) ||
      nullable(fee) ||
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
      xcmFee: isXcm ? (originFee ?? BN_ZERO) : BN_ZERO,
      destinationFee: isXcm ? (destinationFee ?? null) : null,
      balancePreservation,
    } satisfies FormSubmitEvent;
  },
});

sample({
  clock: formSubmitFinished.filter({ fn: nonNullable }),
  target: formSubmitted,
});

export const formModel = {
  form,

  $initiators,
  $signatories,

  $available,
  $initiatorAccountBalance,
  $signatoryBalance,

  $proxyAccount,
  $multisigAccount,

  $isMyselfXcmEnabled,
  $isMyselfXcmOpened,

  $destinationAccounts,
  $destinationChains,
  $destinationAsset,
  $destinationBalanceEd,
  $hasDestinationBalanceError,

  $fee: $networkFee,
  $pendingFee: $networkFeePending,
  $multisigDeposit,
  $originFee: xcmSpellTransferModel.$originFee,
  $destinationFee: xcmSpellTransferModel.$destinationFee,

  $coreTx,
  $feeTx,
  $tx,
  $api,
  $networkStore,
  $isXcm,
  $isChainConnected,
  $canSubmit,
  $asset,

  $errors,

  $xcmApi: xcmSpellTransferModel.$apiDestination,

  $isExistentialDepositEnabled,
  $isMaxModeEnabled,
  $showEDSwitch,
  $showAccountDeathAlert,
  $isNative,

  formInitiated,
  formCleared: form.reset,

  myselfClicked,
  xcmDestinationSelected,
  xcmDestinationCancelled,

  multisigDepositChanged,

  formSubmitted,

  events: {
    toggleExistentialDeposit,
    toggleMaxMode: setMaxMode,
  },
};
