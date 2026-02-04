import { BN, BN_ZERO } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { chainsService } from '@/shared/api/network';
import { type Balance, type Chain, ChainOptions } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { assert, getNativeAsset, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import {
  type MultiTransferRow,
  type MultiTransferRowSerialized,
  type ValidationIssue,
  MultiTransferCsvError,
} from '@/entities/multi-transfer';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type ValidationSchemaOptions, Step } from '../types';
import { multiTransferUtils } from '../utils';

import { type MultiTransferConfirm, confirmModel } from './confirm';

type FormData = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  transfers: MultiTransferRow[];
};

const stepChanged = createEvent<Step>();
const flowStarted = createEvent();
const flowFinished = createEvent();
const $step = restore(stepChanged, Step.NONE).reset(flowFinished);

const form: Form<FormData> = createForm<FormData>({
  fields: {
    chain: {
      defaultValue: null,
      validator: () => (chain) => {
        if (!chain) return { message: 'multiTransfer.errors.form.chainRequired' };
      },
    },
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (nullable(signatory)) return { message: 'multiTransfer.errors.form.signatoryRequired' };
      },
    },
    transfers: {
      defaultValue: [],
      validator: () => (transfers) => {
        if (transfers.length === 0) return { message: 'multiTransfer.errors.form.csvRequired' };
      },
    },
  },
});

const fileUploaded = createEvent<File>();
const csvReset = [fileUploaded, form.fields.chain.change];

const $fileName = createStore<string | null>(null).reset(csvReset);
const $parsedCsvRaw = createStore<MultiTransferRowSerialized[] | null>(null).reset(csvReset);
const $parsedCsv = createStore<MultiTransferRow[] | null>(null).reset(csvReset);
const $csvError = createStore<MultiTransferCsvError | null>(null).reset(csvReset);
const $csvIssues = createStore<ValidationIssue[] | null>(null).reset(csvReset);
const $recipientBalances = createStore<Map<AccountId, Balance>>(new Map()).reset(csvReset);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
const parseFileFx = createEffect<File, MultiTransferRowSerialized[], MultiTransferCsvError>(async (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw MultiTransferCsvError.STRUCTURE;
  }

  const parsed = await multiTransferUtils.parseCSV(file);
  if (parsed.success) return parsed.data;

  throw parsed.error;
});

type ValidateFileParams = {
  parsedFile: MultiTransferRowSerialized[];
  validationSchemaOptions: ValidationSchemaOptions;
};

type ValidateFileResults = {
  data: MultiTransferRow[];
  issues: ValidationIssue[];
};

const rootValidateFileFx = createEffect<ValidateFileParams, ValidateFileResults, ValidationIssue[]>((params) => {
  const basicValidationOptions = { chain: params.validationSchemaOptions.chain };
  const validated = multiTransferUtils.validateCSV(params.parsedFile, basicValidationOptions);

  const data: MultiTransferRow[] = [];

  for (let i = 0; i < params.parsedFile.length; i++) {
    const record = params.parsedFile[i];
    if (!record) continue;

    const parsedRecipient = multiTransferUtils.parseRecipientField(
      record.recipient.raw,
      params.validationSchemaOptions.chain,
    );

    const parsedAmount = multiTransferUtils.parseAmountField(record.amount.raw);

    data.push({
      recipient: {
        raw: record.recipient.raw,
        parsed: parsedRecipient,
      },
      amount: {
        raw: record.amount.raw,
        parsed: parsedAmount,
      },
    });
  }

  let allIssues = validated.issues;
  if (params.validationSchemaOptions.recipientBalances) {
    const edValidated = multiTransferUtils.validateCSV(params.parsedFile, params.validationSchemaOptions);
    allIssues = multiTransferUtils.mergeValidationIssues(validated.issues, edValidated.issues);
  }

  return { data, issues: allIssues };
});

const validateFileFx = attach({
  source: {
    parsedCsvRaw: $parsedCsvRaw,
    chain: form.fields.chain.$value,
    recipientBalances: $recipientBalances,
  },
  mapParams: (_: void, { parsedCsvRaw, chain, recipientBalances }) => {
    assert(parsedCsvRaw);
    assert(chain);

    return {
      parsedFile: parsedCsvRaw,
      validationSchemaOptions: { chain, recipientBalances },
    } satisfies ValidateFileParams;
  },
  effect: rootValidateFileFx,
});

const $availableChains = combine(
  {
    chains: networkModel.$chains,
    selectedAccounts: walletSelect.$selectedAccounts,
  },
  ({ chains, selectedAccounts }) => {
    const filteredChains = Object.values(chains).filter((chain) => {
      return (
        chain.options?.includes(ChainOptions.MULTI_TRANSFER) &&
        selectedAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain))
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

const $amount = form.fields.transfers.$value.map((transfers) =>
  transfers.reduce((amount, transfer) => amount.add(transfer.amount.parsed || BN_ZERO), BN_ZERO),
);

const $asset = form.fields.chain.$value.map((c) => (c ? getNativeAsset(c.assets) : null));
const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

const $coreTx = combine(
  {
    chain: form.fields.chain.$value,
    signatory: form.fields.signatory.$value,
    transfers: form.fields.transfers.$value,
  },
  ({ chain, signatory, transfers }) => {
    if (nullable(chain) || nullable(signatory) || transfers.length === 0) return null;

    const validTransfers = transfers
      .filter((t) => t.recipient.parsed && t.amount.parsed)
      .map((t) => ({
        recipient: t.recipient.parsed!,
        amount: t.amount.parsed!,
      }));

    if (validTransfers.length === 0) return null;

    return transactionBuilder.buildMultiTransfer({
      chain,
      accountId: signatory.accountId,
      transfers: validTransfers,
    });
  },
);

const $feeCoreTx = combine(
  {
    chain: form.fields.chain.$value,
    signatory: form.fields.signatory.$value,
  },
  ({ chain, signatory }) => {
    if (nullable(chain) || nullable(signatory)) return null;

    return transactionBuilder.buildMultiTransfer({
      chain,
      accountId: signatory.accountId,
      transfers: [
        {
          recipient: createAccountId(1),
          amount: new BN(1000000000000),
        },
        {
          recipient: createAccountId(2),
          amount: new BN(2000000000000),
        },
      ],
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: form.fields.chain.$value,
  transaction: $coreTx,
  feeTransaction: $feeCoreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
});

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

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isTxValid: $isTxValid,
    fee: $fee,
    csvIssues: $csvIssues,
    csvError: $csvError,
  },
  ({ isFormValid, isTxValid, fee, csvIssues, csvError }) => {
    const hasCsvErrors = nonNullable(csvError) || csvIssues?.some((issue) => issue.severity === 'error');
    return isFormValid && isTxValid && nonNullable(fee) && !hasCsvErrors;
  },
);

sample({
  clock: fileUploaded,
  fn: (file) => file.name,
  target: $fileName,
});

sample({
  clock: fileUploaded,
  target: parseFileFx,
});

sample({
  clock: parseFileFx.doneData,
  target: $parsedCsvRaw,
});

sample({
  clock: parseFileFx.failData,
  target: $csvError,
});

sample({
  clock: parseFileFx.doneData,
  source: {
    parsedCsvRaw: $parsedCsvRaw,
    chain: form.fields.chain.$value,
  },
  filter: ({ parsedCsvRaw, chain }) => nonNullable(parsedCsvRaw) && nonNullable(chain),
  target: validateFileFx,
});

sample({
  clock: validateFileFx.doneData,
  source: {
    chain: form.fields.chain.$value,
  },
  fn: ({ chain }, { data }) => {
    if (nullable(chain)) {
      return [];
    }
    const recipients = data.map((row) => row.recipient.parsed).filter((r): r is AccountId => nonNullable(r));
    return recipients.map((accountId) => ({ accountId, chain }));
  },
  target: balanceSubModel.fetchAccountIds,
});

const $recipientBalancesMap = combine(
  {
    parsedCsv: $parsedCsv,
    chain: form.fields.chain.$value,
    asset: $asset,
    balances: balanceModel.$balanceMap,
  },
  ({ parsedCsv, chain, asset, balances }) => {
    if (nullable(parsedCsv) || nullable(chain) || nullable(asset) || parsedCsv.length === 0) {
      return new Map<AccountId, Balance>();
    }

    const recipientBalances = new Map<AccountId, Balance>();

    for (const row of parsedCsv) {
      const recipientId = row.recipient.parsed;
      if (recipientId) {
        const balance = balanceUtils.getBalance(balances, recipientId, chain.chainId, asset.assetId);
        if (balance) {
          recipientBalances.set(recipientId, balance);
        }
      }
    }

    return recipientBalances;
  },
);

sample({
  clock: $recipientBalancesMap,
  target: $recipientBalances,
});

sample({
  clock: validateFileFx.doneData,
  fn: ({ data }) => data,
  target: [$parsedCsv, form.fields.transfers.change],
});

// Re-validate with recipient balances for ED check
const revalidateWithBalancesFx = attach({
  source: {
    parsedCsvRaw: $parsedCsvRaw,
    chain: form.fields.chain.$value,
    recipientBalances: $recipientBalances,
  },
  effect: createEffect<
    { parsedFile: MultiTransferRowSerialized[]; chain: Chain; recipientBalances?: Map<AccountId, Balance> },
    ValidationIssue[],
    void
  >(({ parsedFile, chain, recipientBalances }) => {
    if (!parsedFile || parsedFile.length === 0) {
      return [];
    }

    const validationOptions: ValidationSchemaOptions = {
      chain,
      recipientBalances,
    };

    const validated = multiTransferUtils.validateCSV(parsedFile, validationOptions);
    return validated.issues;
  }),
  mapParams: (_: void, { parsedCsvRaw, chain, recipientBalances }) => {
    assert(parsedCsvRaw);
    assert(chain);

    return {
      parsedFile: parsedCsvRaw,
      chain,
      recipientBalances,
    };
  },
});

sample({
  clock: $recipientBalances,
  source: {
    parsedCsvRaw: $parsedCsvRaw,
    chain: form.fields.chain.$value,
  },
  filter: ({ parsedCsvRaw, chain }) => nonNullable(parsedCsvRaw) && nonNullable(chain),
  target: revalidateWithBalancesFx,
});

sample({
  clock: revalidateWithBalancesFx.doneData,
  source: $csvIssues,
  fn: (existingIssues, newIssues) => {
    if (nullable(existingIssues)) {
      return newIssues;
    }
    return multiTransferUtils.mergeValidationIssues(existingIssues, newIssues);
  },
  target: $csvIssues,
});

sample({
  clock: validateFileFx.doneData,
  fn: ({ issues }) => issues,
  target: $csvIssues,
});

sample({
  clock: validateFileFx.doneData,
  fn: () => null,
  target: $csvError,
});

sample({
  clock: validateFileFx.failData,
  source: {
    parsedCsvRaw: $parsedCsvRaw,
    chain: form.fields.chain.$value,
  },
  fn: ({ parsedCsvRaw, chain }, issues: ValidationIssue[]) => {
    let data: MultiTransferRow[] | null = null;
    if (parsedCsvRaw && chain) {
      data = parsedCsvRaw.map((record) => {
        // Parse recipient independently
        const parsedRecipient = multiTransferUtils.parseRecipientField(record.recipient.raw, chain);

        // Parse amount independently
        const parsedAmount = multiTransferUtils.parseAmountField(record.amount.raw);

        return {
          recipient: {
            raw: record.recipient.raw,
            parsed: parsedRecipient,
          },
          amount: {
            raw: record.amount.raw,
            parsed: parsedAmount,
          },
        };
      });
    }

    return {
      csvError: MultiTransferCsvError.DATA,
      csvIssues: Array.isArray(issues) ? issues : [issues],
      parsedCsv: data,
    };
  },
  target: spread({
    csvError: $csvError,
    csvIssues: $csvIssues,
    parsedCsv: $parsedCsv,
  }),
});

sample({
  clock: flowStarted,
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

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, form.reset],
});

sample({
  clock: $signatories,
  target: balanceSubModel.fetchAccounts,
});

sample({
  clock: [flowStarted, $availableChains],
  source: {
    chains: $availableChains,
    selectedChain: form.fields.chain.$value,
  },
  filter: ({ chains, selectedChain }) =>
    chains.length > 0 && (nullable(selectedChain) || !chains.some((chain) => chain.chainId === selectedChain.chainId)),
  fn: ({ chains }) => chains[0],
  target: form.fields.chain.change,
});

sample({
  clock: [flowStarted, $initiators],
  source: $initiators,
  fn: (initiators) => initiators.at(0) ?? null,
  target: form.fields.initiator.change,
});

sample({
  clock: [flowStarted, $signatories],
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
    form.fields.transfers.resetError,
    form.fields.transfers.reset,
  ],
});

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
    transfers: form.fields.transfers.$value,
    issues: $csvIssues,
  },
  fn: (sourceData, form) => {
    const { issues, ...source } = sourceData;
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
      transfers: source.transfers,
      issues: issues,
    } satisfies MultiTransferConfirm;
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
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

export const formModel = {
  form,
  stepChanged,
  flowStarted,
  flowFinished,

  fileUploaded,

  $step,
  $fileName,
  $parsedCsv,
  $parsedCsvRaw,
  $csvError,
  $csvIssues,
  $availableChains,
  $initiators,
  $signatories,
  $showSignatories,
  $amount,
  $asset,
  $chain: form.fields.chain.$value,
  $fee,
  $pendingFee,
  $tx,
  $txErrors,
  $isTxValid,
  $canSubmit,
  $hasMultisigAccount,
  $multisigDeposit,
};
