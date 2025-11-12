import { BN } from '@polkadot/util';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { chainsService } from '@/shared/api/network';
import { type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import { assert, getNativeAsset, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService, block } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { type VestingSchedule } from '@/entities/vesting';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { proxiesUtils } from '@/features/proxies';
import { Step, VestingScheduleError, VestingScheduleFileErrors } from '../types';
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

const $csvErrors = createStore<VestingScheduleError | null>(null).reset(flow.open);

const fileUploaded = createEvent<File>();

const parseFileContentFx = attach({
  source: {
    currentBlock: block.$currentBlock,
    chain: form.fields.chain.$value,
  },
  async effect({ currentBlock, chain }, file) {
    if (!chain) {
      throw new VestingScheduleError(VestingScheduleFileErrors.CHAIN_NOT_SELECTED);
    }

    const minStartingBlock = new BN(currentBlock[chain.chainId]);

    try {
      const parsedRecords = await vestedTransferUtils.parseCSV(file);
      const schema = vestedTransferUtils.createVestingScheduleSchema({ chain, minStartingBlock });
      const validatedData = vestedTransferUtils.validateCSV(parsedRecords, schema);

      return validatedData;
    } catch (error) {
      if (error instanceof VestingScheduleError) {
        throw error;
      } else {
        throw new VestingScheduleError(VestingScheduleFileErrors.INVALID_CSV_STRUCTURE);
      }
    }
  },
});

sample({
  clock: fileUploaded,
  target: parseFileContentFx,
});

sample({
  clock: parseFileContentFx.doneData,
  target: form.fields.vestingSchedule.change,
});

sample({
  clock: parseFileContentFx.failData,
  fn: (errors) => errors as unknown as VestingScheduleError,
  target: $csvErrors,
});

const $vestingSchedule = form.fields.vestingSchedule.$value;

const $amount = $vestingSchedule.map((vestingSchedule) =>
  vestingSchedule.reduce((amount, vestingRecord) => amount.add(vestingRecord.locked), new BN(0)),
);

const $chain = form.fields.chain.$value;

const $asset = form.fields.chain.$value.map((c) => (c ? getNativeAsset(c.assets) : null));

const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

const $coreTx = combine(
  {
    chain: $chain,
    signatory: form.fields.signatory.$value,
    vestingSchedule: $vestingSchedule,
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
  DEBUG: true,
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
const { $errors: $txErrors, $valid: $isTxValid } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    chain: $chain,
    amount: $amount,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const $hasMultisigAccount = $multisigThreshold.map((threshold) => nonNullable(threshold));

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $allChains = networkModel.$chains.map((chains) => Object.values(chains));

const $availableChains = combine(
  {
    chains: $allChains,
    selectedAccounts: walletSelect.$selectedAccounts,
  },
  ({ chains, selectedAccounts }) => {
    const proxyChains = chains.filter(proxiesUtils.isPureProxy);
    const filteredChains = proxyChains.filter((chain) => {
      return selectedAccounts.some((account) => accountService.isAccountAvailableOnChain(account, chain));
    });
    return chainsService.sortChains(filteredChains);
  },
);

const $initiators = createInitiatorsStore({
  chain: $chain,
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
  clock: form.fields.chain.change,
  target: form.fields.vestingSchedule.resetError,
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
  ({ isFormValid, isTxValid, fee }) => isFormValid && isTxValid && !fee?.isZero(),
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

  $canSubmit,
  $step,
  $api,
  $fee,
  $pendingFee,
  $multisigDeposit,
  $hasMultisigAccount,
  $txErrors,
  $chain,
  $asset,
  $amount,
  $vestingSchedule,
  $csvErrors,
  $allChains: $allChains,
  $availableChains: $availableChains,
  $signatories: $signatories,
  $showSignatories: $showSignatories,

  stepChanged,
  fileUploaded,
};
