import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { t } from 'i18next';
import { and, debounce, not, or, spread } from 'patronum';

import { spellXcmService } from '@/shared/api/xcm';
import { categorizeXcmError } from '@/shared/api/xcm/service/xcm-error-utils';
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
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type TransactionValidationDryRunError, type TransactionValidationNetworkError } from '@/shared/ui-entities';
import {
  type AnyAccount,
  type BalancePreservation,
  INDEXER_URL,
  accountService,
  accounts,
  balanceService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { proxiedChainResource } from '@/entities/proxy';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { transferValidator } from '@/features/operations/OperationsValidation';
import { type NetworkStore, type NetworkStoreParams } from '../lib/types';

import { xcmSpellTransferModel } from './xcm-spell-transfer-model';

function normalizeFee(fee: BN | null | undefined): BN {
  return fee && !fee.isZero() ? fee : BN_ZERO;
}

function calculateMaxTransferableAmount(
  availableBalance: BN,
  originFee: BN | null | undefined,
  destinationFee: BN | null | undefined,
): BN {
  let maxAmount = availableBalance;
  const normalizedOriginFee = normalizeFee(originFee);
  const normalizedDestinationFee = normalizeFee(destinationFee);

  if (!normalizedOriginFee.isZero()) {
    maxAmount = BN.max(BN_ZERO, maxAmount.sub(normalizedOriginFee));
  }
  if (!normalizedDestinationFee.isZero()) {
    maxAmount = BN.max(BN_ZERO, maxAmount.sub(normalizedDestinationFee));
  }

  return maxAmount;
}

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
  originFee: BN;
  destinationFee: BN | null;
  multisigDeposit: BN;
  rawAmount: string;
  balancePreservation: BalancePreservation;
};

const formInitiated = createEvent<NetworkStoreParams>();
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

const maxModeFinalAmountApplied = createEvent();
const $hasMaxModeFinalAmountBeenApplied = createStore(false)
  .on(maxModeFinalAmountApplied, () => true)
  .reset(formInitiated, setMaxMode.filter({ fn: (enabled) => !enabled }));

const $maxModeAvailableBalanceAfterFees = createStore<BN | null>(null).reset(
  formInitiated,
  setMaxMode.filter({ fn: (enabled) => !enabled }),
);

const $isEdSwitchVisible = createStore(false)
  .on(setMaxMode.filter({ fn: (value) => value }), () => true)
  .reset(formInitiated);

const $networkStore = createStore<NetworkStore | null>(null).on(formInitiated, (_, params) => {
  const asset = params.asset ?? getNativeAsset(params.chain.assets);
  return {
    chain: params.chain,
    asset,
    destination: params.destination,
  };
});
const $isNative = $networkStore.map((network) => {
  if (!network) return false;
  const nativeAsset = getNativeAsset(network.chain.assets);
  return nativeAsset ? getAssetId(nativeAsset) === getAssetId(network.asset) : false;
});

const $isAssetPredefined = createStore(false).on(formInitiated, (_, params) => params.asset !== undefined);

const $isXcmEnabled = createStore(false).on(formInitiated, (_, params) => params.xcm ?? true);

const $initialDestination = createStore<string | null>(null).on(
  formInitiated,
  (_, { destination }) => destination ?? null,
);

const $isDestinationReadonly = $initialDestination.map(nonNullable);

const showTokenSelector = createEvent();
const hideTokenSelector = createEvent();
const assetChanged = createEvent<Asset>();
const chainChanged = createEvent<Chain>();

const $isTokenSelectorOpen = createStore(false)
  .on(showTokenSelector, () => true)
  .on(hideTokenSelector, () => false)
  .reset(formInitiated);

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
    isXcmEnabled: $isXcmEnabled,
  },
  ({ source, destination, isXcmEnabled }) => {
    if (!isXcmEnabled) return false;

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

    const status = statuses[network.chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
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

// pure proxy chain restriction

// Local accounts check (synchronous)
const $localProxyChainId = combine(
  {
    destinationAccountId: $destinationAccountId,
    allAccounts: accounts.$list,
  },
  ({ destinationAccountId, allAccounts }): ChainId | null => {
    if (nullable(destinationAccountId)) return null;

    for (const account of allAccounts) {
      if (account.accountId !== destinationAccountId) continue;
      if (accountUtils.isPureProxiedAccount(account) || accountUtils.isFlexibleMultisigAccount(account)) {
        return account.chainId;
      }
    }

    return null;
  },
);

// Indexer query via resource (for external addresses not in local accounts)
const $externalProxyChainId = createStore<ChainId | null>(null).reset(formInitiated);

const destinationAccountIdDebounced = debounce({
  source: $destinationAccountId,
  timeout: 400,
});

sample({
  clock: destinationAccountIdDebounced,
  source: {
    accountId: $destinationAccountId,
    localResult: $localProxyChainId,
  },
  filter: ({ accountId, localResult }) => nonNullable(accountId) && nullable(localResult),
  fn: ({ accountId }) => ({
    accountId: accountId!,
    indexerUrl: INDEXER_URL,
  }),
  target: proxiedChainResource.fetch,
});

sample({
  clock: $destinationAccountId,
  fn: () => null,
  target: $externalProxyChainId,
});

sample({
  clock: proxiedChainResource.fetch.doneData,
  target: $externalProxyChainId,
});

// Merged result: local takes priority over indexer
const $destinationProxyChainId = combine(
  { local: $localProxyChainId, external: $externalProxyChainId },
  ({ local, external }): ChainId | null => local ?? external,
);

const $proxyChain = combine(
  {
    proxyChainId: $destinationProxyChainId,
    chains: networkModel.$chains,
  },
  ({ proxyChainId, chains }): Chain | null => {
    if (nullable(proxyChainId)) return null;

    return chains[proxyChainId] ?? null;
  },
);

const $isPureProxyChainMismatch = combine(
  {
    proxyChainId: $destinationProxyChainId,
    destinationChain: $destinationChain,
  },
  ({ proxyChainId, destinationChain }) => {
    if (nullable(proxyChainId) || nullable(destinationChain)) return false;

    return proxyChainId !== destinationChain.chainId;
  },
);

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
    excludeActions: combine($isXcm, (isXcm) => (isXcm ? ['fee'] : [])),
    dryRunResult: xcmSpellTransferModel.$buildTransferDryRunResult,
  },
});

const errorsDebounced = debounce({
  source: $errorsImmediate,
  timeout: 300,
});

const $validationErrors = createStore($errorsImmediate.defaultState).reset(formInitiated);

sample({
  clock: errorsDebounced,
  source: $validationPending,
  filter: (pending) => !pending,
  fn: (_, errors) => errors,
  target: $validationErrors,
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
  clock: [setMaxMode.filter({ fn: (enabled) => enabled }), $balancePreservationStrategy],
  source: {
    balance: $availableBalance,
    balancePreservationStrategy: $balancePreservationStrategy,
    isMaxModeEnabled: $isMaxModeEnabled,
  },
  filter: ({ balance, isMaxModeEnabled }) => nonNullable(balance) && isMaxModeEnabled,
  fn: ({ balance, balancePreservationStrategy }) =>
    balanceService.withdrawableAmount(balance!, balancePreservationStrategy),
  target: $maxModeAvailableBalanceAfterFees,
});

sample({
  source: {
    balance: $availableBalance,
    balancePreservationStrategy: $balancePreservationStrategy,
    isMaxModeEnabled: $isMaxModeEnabled,
    availableBalanceAfterFees: $maxModeAvailableBalanceAfterFees,
    hasFinalAmountBeenApplied: $hasMaxModeFinalAmountBeenApplied,
  },
  fn: ({
    balance,
    balancePreservationStrategy,
    isMaxModeEnabled,
    availableBalanceAfterFees,
    hasFinalAmountBeenApplied,
  }) => {
    if (nullable(balance)) return null;

    if (isMaxModeEnabled && nonNullable(availableBalanceAfterFees) && hasFinalAmountBeenApplied) {
      return availableBalanceAfterFees;
    }

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
        const status = statuses[chain.chainId];
        if (!status) return false;

        return networkUtils.isConnectedStatus(status);
      });

    return [network.chain].concat(xcmChains);
  },
);

const $availableChains = combine(
  {
    chains: networkModel.$chainsList,
    initialDestination: $initialDestination,
  },
  ({ chains, initialDestination }) => {
    if (nullable(initialDestination) || !validateAddress(initialDestination)) {
      return chains;
    }

    const destinationAccountId = toAccountId(initialDestination);
    return chains.filter((chain) => accountService.isAccountSchemeMatchChain(destinationAccountId, chain));
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

const $isCoreTxReady = $coreTx.map(nonNullable);
const $isTxReady = $tx.map(nonNullable);

const $areTransactionsReady = and($isCoreTxReady, $isTxReady);

const $hasDryRunError = combine(
  {
    isXcm: $isXcm,
    buildTransferDryRunResult: xcmSpellTransferModel.$buildTransferDryRunResult,
  },
  ({ isXcm, buildTransferDryRunResult }) => {
    if (!isXcm) return false;
    return buildTransferDryRunResult?.success === false;
  },
);

const $canSubmit = and(
  form.$isValid,
  $valid,
  not($hasDestinationBalanceError),
  not($isPureProxyChainMismatch),
  or(not($isXcm), not(xcmSpellTransferModel.$isDestinationFeeLoading)),
  or(not($isXcm), $areTransactionsReady),
  or(not($isXcm), not($hasDryRunError)),
);

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ xcm }) => xcm !== false,
  fn: ({ chain, asset }) => ({ chain, asset: asset ?? getNativeAsset(chain.assets)! }),
  target: [xcmSpellTransferModel.events.xcmStarted, xcmSpellTransferModel.events.xcmStopped],
});

$networkStore.on(assetChanged, (store, asset) => {
  if (!store) return store;

  return {
    chain: store.chain,
    asset,
    destination: store.destination,
  };
});

sample({
  clock: assetChanged,
  fn: () => false,
  target: $isTokenSelectorOpen,
});

$networkStore.on(chainChanged, (store, chain) => {
  if (!store) return store;

  const currentAsset = store.asset;
  const assetOnChain = chain.assets.find((a) => a.symbol === currentAsset.symbol);
  const newAsset = assetOnChain ?? getNativeAsset(chain.assets)!;

  return {
    chain,
    asset: newAsset,
    destination: store.destination,
  };
});

sample({
  clock: chainChanged,
  fn: (chain) => chain,
  target: form.fields.destinationChain.change,
});

sample({
  clock: formInitiated,
  filter: ({ chain }) => Boolean(chain),
  fn: ({ chain }) => chain,
  target: form.fields.destinationChain.change,
});

sample({
  clock: [$initiators, formInitiated],
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
  source: $initialDestination,
  filter: (initialDestination) => !initialDestination,
  target: form.fields.destination.reset,
});

sample({
  clock: formInitiated,
  filter: ({ destination }) => Boolean(destination),
  fn: ({ destination }) => destination!,
  target: form.fields.destination.change,
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
  source: $isXcmEnabled,
  filter: (isXcmEnabled) => isXcmEnabled,
  fn: (_, chain) => chain.chainId,
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
  source: $hasMaxModeFinalAmountBeenApplied,
  filter: (hasFinalAmountBeenApplied) => !hasFinalAmountBeenApplied,
  fn: (_, amount) => amount,
  target: xcmSpellTransferModel.events.rawAmountChanged,
});

sample({
  clock: form.fields.initiator.change,
  fn: (initiator) => initiator?.accountId ?? null,
  target: xcmSpellTransferModel.events.initiatorAccountIdChanged,
});

sample({
  clock: setMaxMode.filter({ fn: (enabled) => enabled }),
  source: {
    availableBalance: $available,
    network: $networkStore,
    isXcm: $isXcm,
    originFee: xcmSpellTransferModel.$originFee,
    destinationFee: xcmSpellTransferModel.$destinationFee,
    asset: $asset,
  },
  filter: ({ availableBalance, network, asset }) =>
    nonNullable(availableBalance) && nonNullable(network) && nonNullable(asset),
  fn: ({ availableBalance, isXcm, originFee, destinationFee, asset }) => {
    if (!isXcm) {
      return toAssetPrecision(availableBalance!, asset!.precision);
    }
    const maxTransferableAmount = calculateMaxTransferableAmount(availableBalance!, originFee, destinationFee);
    return toAssetPrecision(maxTransferableAmount, asset!.precision);
  },
  target: form.fields.amount.change,
});

sample({
  clock: $available,
  source: {
    isMaxModeEnabled: $isMaxModeEnabled,
    network: $networkStore,
    currentAmountValue: form.fields.amount.$value,
    isRegularFeePending: $networkFeePending,
    isXcm: $isXcm,
    isXcmFeeLoading: xcmSpellTransferModel.$isDestinationFeeLoading,
    isValidationPending: $validationPending,
    hasFinalAmountBeenApplied: $hasMaxModeFinalAmountBeenApplied,
    originFee: xcmSpellTransferModel.$originFee,
    destinationFee: xcmSpellTransferModel.$destinationFee,
    asset: $asset,
  },
  filter: (
    {
      isMaxModeEnabled,
      network,
      currentAmountValue,
      isRegularFeePending,
      isXcm,
      isXcmFeeLoading,
      isValidationPending,
      hasFinalAmountBeenApplied,
      originFee,
      destinationFee,
      asset,
    },
    availableBalance,
  ) => {
    if (!isMaxModeEnabled || nullable(network) || nullable(availableBalance) || nullable(asset)) return false;
    if (hasFinalAmountBeenApplied) return false;
    const isAnyFeePending = isXcm ? isXcmFeeLoading : isRegularFeePending;
    if (isAnyFeePending || isValidationPending) return false;
    if (!isXcm) {
      const newAmountValue = toAssetPrecision(availableBalance!, asset!.precision);
      return currentAmountValue !== newAmountValue;
    }
    const maxTransferableAmount = calculateMaxTransferableAmount(availableBalance!, originFee, destinationFee);
    if (maxTransferableAmount.isZero() && !availableBalance!.isZero()) {
      return false;
    }
    const newAmountValue = toAssetPrecision(maxTransferableAmount, asset!.precision);
    return currentAmountValue !== newAmountValue;
  },
  fn: ({ isXcm, originFee, destinationFee, asset, currentAmountValue }, availableBalance) => {
    if (!isXcm) {
      return toAssetPrecision(availableBalance!, asset!.precision);
    }
    const maxTransferableAmount = calculateMaxTransferableAmount(availableBalance!, originFee, destinationFee);
    if (maxTransferableAmount.isZero() && !availableBalance!.isZero()) {
      return currentAmountValue;
    }
    return toAssetPrecision(maxTransferableAmount, asset!.precision);
  },
  target: form.fields.amount.change,
});

const xcmFeesCalculatedForMaxMode = createEvent<{
  availableBalanceAfterFees: BN;
  maxTransferableAmountFormatted: string;
}>();

sample({
  clock: [xcmSpellTransferModel.$originFee, xcmSpellTransferModel.$destinationFee],
  source: {
    isMaxModeEnabled: $isMaxModeEnabled,
    isXcm: $isXcm,
    isXcmFeeLoading: xcmSpellTransferModel.$isDestinationFeeLoading,
    isRegularFeePending: $networkFeePending,
    balance: $availableBalance,
    balancePreservationStrategy: $balancePreservationStrategy,
    network: $networkStore,
    asset: $asset,
    originFee: xcmSpellTransferModel.$originFee,
    destinationFee: xcmSpellTransferModel.$destinationFee,
  },
  filter: ({ isMaxModeEnabled, isXcm, isXcmFeeLoading, isRegularFeePending, balance, network, asset }) => {
    if (!isMaxModeEnabled || !isXcm || nullable(balance) || nullable(network) || nullable(asset)) return false;
    return !isXcmFeeLoading && !isRegularFeePending;
  },
  fn: ({ balance, balancePreservationStrategy, originFee, destinationFee, asset }) => {
    const availableBalanceAfterFees = balanceService.withdrawableAmount(balance!, balancePreservationStrategy);
    const maxTransferableAmount = calculateMaxTransferableAmount(availableBalanceAfterFees, originFee, destinationFee);

    return {
      availableBalanceAfterFees,
      maxTransferableAmountFormatted: toAssetPrecision(maxTransferableAmount, asset!.precision),
    };
  },
  target: xcmFeesCalculatedForMaxMode,
});

sample({
  clock: xcmFeesCalculatedForMaxMode,
  fn: ({ availableBalanceAfterFees }) => availableBalanceAfterFees,
  target: $maxModeAvailableBalanceAfterFees,
});

sample({
  clock: xcmFeesCalculatedForMaxMode,
  target: maxModeFinalAmountApplied,
});

sample({
  clock: xcmFeesCalculatedForMaxMode,
  source: $hasMaxModeFinalAmountBeenApplied,
  filter: (hasFinalAmountBeenApplied) => hasFinalAmountBeenApplied,
  fn: (_, { maxTransferableAmountFormatted }) => maxTransferableAmountFormatted,
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
      originFee: isXcm ? (originFee ?? BN_ZERO) : BN_ZERO,
      destinationFee: isXcm ? (destinationFee ?? null) : null,
      balancePreservation,
    } satisfies FormSubmitEvent;
  },
});

sample({
  clock: formSubmitFinished.filter({ fn: nonNullable }),
  target: formSubmitted,
});

const $hasAmountAndAddress = combine(
  {
    amount: form.fields.amount.$value,
    destination: form.fields.destination.$value,
  },
  ({ amount, destination }) => {
    return Boolean(amount && destination && validateAddress(destination));
  },
);

const $errors = combine(
  {
    validationErrors: $validationErrors,
    hasAmountAndAddress: $hasAmountAndAddress,
    isChainConnected: $isChainConnected,
    isFormValid: form.$isValid,
    network: $networkStore,
    isXcm: $isXcm,
    buildTransferDryRunResult: xcmSpellTransferModel.$buildTransferDryRunResult,
    xcmChain: xcmSpellTransferModel.$xcmChain,
  },
  ({
    validationErrors,
    hasAmountAndAddress,
    isChainConnected,
    isFormValid,
    network,
    isXcm,
    buildTransferDryRunResult,
    xcmChain,
  }) => {
    const result: (
      | (typeof validationErrors)[number]
      | TransactionValidationNetworkError
      | TransactionValidationDryRunError
    )[] = [...validationErrors];

    if (validationErrors.length > 0) return result;
    if (!hasAmountAndAddress || !isFormValid) return result;

    if (!isChainConnected && network) {
      result.push({
        networkError: true,
        message: t('transfer.networkConnectionError', { network: network.chain.name }),
      });
      return result;
    }

    if (isXcm && buildTransferDryRunResult?.success === false && isChainConnected) {
      const failureReason = buildTransferDryRunResult.failureReason || '';
      const errorInfo = categorizeXcmError(failureReason);

      if (!errorInfo.isInsufficientBalance) {
        result.push({
          dryRunError: true,
          failureReason,
          failureChain: buildTransferDryRunResult.failureChain,
          chainName: xcmChain?.name,
        });
      }
    }

    return result;
  },
);

const $isPreparingTransaction = combine(
  {
    hasAmountAndAddress: $hasAmountAndAddress,
    isFormValid: form.$isValid,
    isXcm: $isXcm,
    isDestinationFeeLoading: xcmSpellTransferModel.$isDestinationFeeLoading,
    pendingFee: $networkFeePending,
    coreTx: $coreTx,
    tx: $tx,
    xcmData: xcmSpellTransferModel.$xcmData,
  },
  ({ hasAmountAndAddress, isFormValid, isXcm, isDestinationFeeLoading, pendingFee, coreTx, tx, xcmData }) => {
    if (!hasAmountAndAddress || !isFormValid) return false;

    if (isXcm && !xcmData) return true;
    if (isXcm && isDestinationFeeLoading) return true;
    if (!isXcm && pendingFee) return true;
    if (!coreTx || !tx) return true;

    return false;
  },
);

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

  $availableChains,
  $destinationAccounts,
  $destinationChains,
  $destinationAsset,
  $destinationBalanceEd,
  $hasDestinationBalanceError,
  $isPureProxyChainMismatch,
  $proxyChain,
  $isDestinationReadonly,

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

  $isPreparingTransaction,

  $isAssetPredefined,
  $isXcmEnabled,
  $isTokenSelectorOpen,

  formInitiated,
  formCleared: form.reset,

  myselfClicked,
  xcmDestinationSelected,
  xcmDestinationCancelled,

  showTokenSelector,
  hideTokenSelector,
  assetChanged,
  chainChanged,

  multisigDepositChanged,

  formSubmitted,

  events: {
    toggleExistentialDeposit,
    toggleMaxMode: setMaxMode,
  },
};
