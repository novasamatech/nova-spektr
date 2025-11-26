import { BN, BN_ZERO } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly, spread } from 'patronum';

import { chainsService } from '@/shared/api/network';
import { type Chain, ChainOptions } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { type Form, createForm } from '@/shared/forms';
import { assert, getNativeAsset, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService, block } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import {
  type ValidationIssue,
  VestingCsvError,
  type VestingSchedule,
  type VestingScheduleRaw,
  vestingService,
} from '@/entities/vesting';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { Step, type ValidationSchemaOptions } from '../types';
import { vestedTransferUtils } from '../utils';

import { type VestedTransferConfirm, confirmModel } from './confirm';
import { vestedTransferFeature } from './feature';

type FormData = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  vestingSchedule: VestingSchedule[];
};

const flow = createGate();

const form: Form<FormData> = createForm<FormData>({
  fields: {
    chain: {
      defaultValue: null,
      validator: () => (chain) => {
        if (!chain) return { message: 'vestedTransfer.errors.form.chainRequired' };
      },
    },
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (nullable(signatory)) {
          return { message: 'vestedTransfer.errors.form.signatoryRequired' };
        }
      },
    },
    vestingSchedule: {
      defaultValue: [],
      validator: () => (vestingSchedule) => {
        if (vestingSchedule.length === 0) return { message: 'vestedTransfer.errors.form.csvRequired' };
      },
    },
  },
});

const $amount = form.fields.vestingSchedule.$value.map((vestingSchedule) =>
  vestingSchedule.reduce((amount, vestingRecord) => amount.add(vestingRecord.locked), new BN(0)),
);

const $asset = form.fields.chain.$value.map((c) => (c ? getNativeAsset(c.assets) : null));
const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

const { $: $minStartingBlock } = createStoreFromEffect({
  defaultValue: null,
  params: { currentBlock: block.$currentBlock, chain: form.fields.chain.$value },
  fn: ({ currentBlock, chain }) => {
    const timelineChainId = chain.additional?.timelineChain ?? chain.chainId;
    return new BN(vestingService.getMinStartingBlock(currentBlock, timelineChainId));
  },
});

const { $: $minVestedTransfer } = createStoreFromEffect({
  defaultValue: null,
  params: { api: $api },
  fn: ({ api }) => vestingService.getMinVestedTransfer(api),
});

const { $: $maxVestingSchedules } = createStoreFromEffect({
  defaultValue: null,
  params: { api: $api },
  fn: ({ api }) => vestingService.getMaxVestingSchedules(api),
});

const { $: $existingVestingSchedules } = createStoreFromEffect({
  defaultValue: null,
  params: { api: $api },
  fn: ({ api }) => vestingService.getExistingVestingSchedules(api),
});

const $coreTx = combine(
  {
    chain: form.fields.chain.$value,
    signatory: form.fields.signatory.$value,
    vestingSchedule: form.fields.vestingSchedule.$value,
  },
  ({ chain, signatory, vestingSchedule }) => {
    if (!chain || !signatory || vestingSchedule.length === 0) return null;

    return transactionBuilder.buildVestedTransfer({
      chain: chain,
      accountId: signatory.accountId,
      vestingSchedule,
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  active: vestedTransferFeature.isRunning,
  api: $api,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
});

// validations

const validator = createTxValidator<{
  amount: BN;
  chain: Chain;
}>({
  additionalBalanceRules: [
    ({ route, amount, chain, asset, getBalance }) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      if (amount.isZero()) return;

      const balance = getBalance(initiator.accountId, chain.chainId, asset.assetId);
      assert(balance, `Balance for account ${initiator.accountId} not found`);

      return {
        account: initiator,
        balance: balanceService.tryWithdraw(balance, amount, 'keepAlive'),
        asset,
        action: 'sending amount',
      };
    },
  ],
});
const {
  $errors: $txErrors,
  $valid: $isTxValid,
  $balanceValidationResults,
} = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    chain: form.fields.chain.$value,
    amount: $amount,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $hasMultisigAccount = $route.map((route) => route.some((account) => accountUtils.isAnyMultisigAccount(account)));

const $multisigDeposit = combine({ results: $balanceValidationResults }, ({ results }) => {
  const actions = getActionRequiredAmount(results, 'multisig deposit');
  return actions.reduce((deposit, action) => deposit.add(action.required), BN_ZERO);
});

const $availableChains = combine(
  {
    chains: networkModel.$chains,
    selectedAccounts: walletSelect.$selectedAccounts,
  },
  ({ chains, selectedAccounts }) => {
    const filteredChains = Object.values(chains).filter((chain) => {
      return (
        selectedAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain)) &&
        chain.options?.includes(ChainOptions.VESTED_TRANSFER)
      );
    });
    return chainsService.sortChains(filteredChains);
  },
);

const $initiators = createInitiatorsStore({
  chain: form.fields.chain.$value,
  accounts: walletSelect.$selectedAccounts,
});

const $signatories = createSignatoriesStore({
  chain: form.fields.chain.$value,
  accounts: walletModel.$availableAccounts,
  initiator: form.fields.initiator.$value,
});

const $showSignatories = combine(
  $signatories,
  form.fields.initiator.$value,
  (signatories, initiator) => signatories.length > 1 || signatories.at(0)?.accountId !== initiator?.accountId,
);

sample({
  clock: $signatories,
  target: balanceSubModel.fetchAccounts,
});

const fileUploaded = createEvent<File>();
const $parsedCsv = createStore<VestingScheduleRaw[] | null>(null).reset(flow.open);
const $csvError = createStore<VestingCsvError | null>(null).reset(flow.open);
const $csvIssues = createStore<ValidationIssue[] | null>(null).reset(flow.open);

const parseFileFx = createEffect<File, VestingScheduleRaw[]>(async (file) => {
  const parsed = await vestedTransferUtils.parseCSV(file);
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error();
});

type ValidateFileParams = {
  parsedFile: VestingScheduleRaw[];
  validationSchemaOptions: ValidationSchemaOptions;
};
type ValidateFileResults = { data: VestingSchedule[]; issues: ValidationIssue[] };
const rootValidateFileFx = createEffect<ValidateFileParams, ValidateFileResults, ValidationIssue[]>((params) => {
  const schema = vestedTransferUtils.createValidationSchema(params.validationSchemaOptions);

  const validated = vestedTransferUtils.validateCSV(params.parsedFile, schema);

  if (validated.success) {
    const transformSchema = vestedTransferUtils.createTransformSchema();
    const validatedData = params.parsedFile.map((record) => transformSchema.parse(record));
    return { data: validatedData, issues: validated.issues };
  }

  throw validated.issues;
});

const validateFileFx = attach({
  source: {
    chain: form.fields.chain.$value,
    minStartingBlock: $minStartingBlock,
    minVestedTransfer: $minVestedTransfer,
    maxVestingSchedules: $maxVestingSchedules,
    existingVestingSchedules: $existingVestingSchedules,
  },
  mapParams: (
    parsedFile: VestingScheduleRaw[],
    { chain, minStartingBlock, minVestedTransfer, maxVestingSchedules, existingVestingSchedules },
  ) => {
    assert(parsedFile);
    assert(chain);
    assert(minStartingBlock);
    assert(minVestedTransfer);
    assert(maxVestingSchedules);
    assert(existingVestingSchedules);

    return {
      parsedFile,
      validationSchemaOptions: {
        chain,
        minStartingBlock,
        minVestedTransfer,
        maxVestingSchedules,
        existingVestingSchedules,
      },
    } satisfies ValidateFileParams;
  },
  effect: rootValidateFileFx,
});

sample({
  clock: fileUploaded,
  target: parseFileFx,
});

sample({
  clock: parseFileFx.doneData,
  target: [$parsedCsv, validateFileFx],
});

sample({
  clock: parseFileFx.failData,
  fn: () => VestingCsvError.STRUCTURE,
  target: $csvError,
});

sample({
  clock: validateFileFx.doneData,
  fn: ({ data, issues }) => ({
    data,
    issues: issues.length > 0 ? issues : null,
    csvError: null,
  }),
  target: spread({
    data: form.fields.vestingSchedule.change,
    issues: $csvIssues,
    csvError: $csvError,
  }),
});

sample({
  clock: validateFileFx.failData,
  fn: (issues) => ({
    csvError: VestingCsvError.DATA,
    csvIssues: issues,
  }),
  target: spread({
    csvError: $csvError,
    csvIssues: $csvIssues,
  }),
});

// steps management

const stepChanged = createEvent<Step>();
const $step = readonly(restore(stepChanged, Step.NONE));

sample({
  clock: [flow.open, flow.close],
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: form.submit.done,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: confirmModel.startSigning,
  fn: () => Step.SIGN,
  target: stepChanged,
});

sample({
  clock: signModel.signed,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

// flow setup

sample({
  clock: [flow.open, $availableChains],
  source: $availableChains,
  filter: (chains) => chains.length > 0,
  fn: (chains) => chains.at(0)!,
  target: form.fields.chain.change,
});

sample({
  clock: [flow.open, $initiators],
  source: $initiators,
  fn: (initiators) => initiators.at(0) ?? null,
  target: form.fields.initiator.change,
});

sample({
  clock: [flow.open, $signatories],
  source: $signatories,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: [form.fields.chain.change, fileUploaded],
  target: [
    form.fields.chain.resetError,
    form.fields.initiator.resetError,
    form.fields.signatory.resetError,
    form.fields.vestingSchedule.resetError,
    form.fields.vestingSchedule.reset,
    $parsedCsv.reinit,
    $csvError.reinit,
    $csvIssues.reinit,
    $fee.reinit,
  ],
});

sample({
  clock: flow.close,
  target: form.reset,
});

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isTxValid: $isTxValid,
    fee: $fee,
  },
  ({ isFormValid, isTxValid, fee }) => isFormValid && isTxValid && nonNullable(fee),
);

// submit flow

const showConfirmation = sample({
  clock: form.submit.doneData,
  source: {
    transaction: $tx,
    coreTx: $coreTx,
    fee: $fee,
    api: $api,
    route: $route,
    amount: $amount,
    hasMultisigAccount: $hasMultisigAccount,
    multisigDeposit: $multisigDeposit,
    vestingSchedule: form.fields.vestingSchedule.$value,
  },
  fn: (source, form) => {
    if (!nonNullableMap(source) || !nonNullableMap(form)) return null;

    return {
      chain: form.chain,
      tx: source.transaction,
      coreTx: source.coreTx,
      initiator: form.initiator,
      signatory: form.signatory || form.initiator,
      route: source.route,
      fee: source.fee.toString(),
      amount: source.amount.toString(),
      hasMultisigAccount: source.hasMultisigAccount,
      multisigDeposit: source.multisigDeposit,
      vestingSchedule: source.vestingSchedule,
    } satisfies VestedTransferConfirm;
  },
});

sample({
  clock: showConfirmation.filter({ fn: nonNullable }),
  fn: (payload) => [payload],
  target: confirmModel.init,
});

const sign = sample({
  clock: confirmModel.startSigning,
  source: {
    form: form.$values,
    transaction: $tx,
    api: $api,
  },
  fn({ form, transaction, api }) {
    if (
      nullable(api) ||
      nullable(transaction) ||
      nullable(form.initiator) ||
      nullable(form.signatory) ||
      nullable(form.chain)
    )
      return null;

    return {
      signingPayloads: [
        {
          chain: form.chain,
          account: form.initiator,
          signatory: form.signatory,
          transaction,
        },
      ],
    };
  },
});

sample({
  clock: sign.filter({ fn: nonNullable }),
  fn: (payload) => payload,
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.signed,
  source: flow.status,
  filter: (open) => open,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

export const formModel = {
  flow,
  form,
  $chain: form.fields.chain.$value,

  $canSubmit,
  $step,
  $api,
  $fee,
  $pendingFee,
  $multisigDeposit,
  $hasMultisigAccount,
  $txErrors,
  $asset,
  $amount,
  $parsedCsv,
  $csvError,
  $csvIssues,
  $availableChains: $availableChains,
  $signatories: $signatories,
  $showSignatories: $showSignatories,

  stepChanged,
  fileUploaded,
};
