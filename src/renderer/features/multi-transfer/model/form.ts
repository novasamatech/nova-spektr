import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';

import { chainsService } from '@/shared/api/network';
import { type Chain, ChainOptions } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { assert, nullable } from '@/shared/lib/utils';
import { createInitiatorsStore, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService } from '@/domains/network';
import {
  MultiTransferCsvError,
  type MultiTransferRow,
  type MultiTransferRowSerialized,
  type ValidationIssue,
} from '@/entities/multi-transfer';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { Step, type ValidationSchemaOptions } from '../types';
import { multiTransferUtils } from '../utils';

type FormData = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  transfers: MultiTransferRow[];
};

const stepChanged = createEvent<Step>();
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

const parseFileFx = createEffect<File, MultiTransferRowSerialized[], MultiTransferCsvError>(async (file) => {
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
  const validated = multiTransferUtils.validateCSV(params.parsedFile, params.validationSchemaOptions);

  if (validated.success) {
    const schema = multiTransferUtils.createValidationSchema(params.validationSchemaOptions);
    const data = params.parsedFile.map((record) => {
      const parsed = schema.parse(record);
      return {
        recipient: {
          raw: record.recipient.raw,
          parsed: parsed.recipient,
        },
        amount: {
          raw: record.amount.raw,
          parsed: parsed.amount,
        },
      };
    });

    return { data, issues: validated.issues };
  }

  throw validated.issues;
});

const validateFileFx = attach({
  source: { chain: form.fields.chain.$value },
  mapParams: (parsedFile: MultiTransferRowSerialized[], { chain }) => {
    assert(parsedFile);
    assert(chain);

    return {
      parsedFile,
      validationSchemaOptions: { chain },
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
  target: validateFileFx,
});

sample({
  clock: validateFileFx.doneData,
  fn: ({ data }) => data,
  target: $parsedCsv,
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
  target: $csvIssues,
});

sample({
  clock: validateFileFx.failData,
  fn: () => MultiTransferCsvError.DATA,
  target: $csvError,
});

export const formModel = {
  form,
  stepChanged,
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
};
