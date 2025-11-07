import { BN } from '@polkadot/util';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  assert,
  getNativeAsset,
  nonNullable,
  nonNullableMap,
  nullable,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService, block } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
// TODO move balances subscription to balance model
import { balanceSubModel } from '@/features/assets-balances';
import { signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { Step, type VestingSchedule, VestingScheduleError, VestingScheduleFileErrors } from '../lib/types';
import { vestedTransferUtils } from '../lib/utils';

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
      validator: () => ({
        source: combine({
          fee: $fee,
          balance: $signatoryBalance,
        }),
        fn: (signatory, _, { balance, fee }) => {
          if (!signatory) {
            return { message: 'vestedTransfer.errors.form.signatoryRequired' };
          }

          const withdrawable = withdrawableAmountBN(balance);
          if (withdrawable.lt(fee)) {
            return { message: 'vestedTransfer.errors.form.insufficientBalance' };
          }
        },
      }),
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

const $amount = form.fields.vestingSchedule.$value.map((vestingSchedule) =>
  vestingSchedule.reduce((amount, vestingRecord) => amount.add(vestingRecord.locked), new BN(0)),
);

const $chain = form.fields.chain.$value;

const $asset = form.fields.chain.$value.map((c) => (c ? getNativeAsset(c.assets) : null));

const $api = combine(form.fields.chain.$value, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

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

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    chain: form.fields.chain.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ signatory, chain, balances }) => {
    if (nullable(signatory) || nullable(chain)) return null;

    return (
      balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, getNativeAsset(chain.assets).assetId) ??
      null
    );
  },
);

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

const $allChains = networkModel.$chains.map((chains) => Object.values(chains));

const $availableChains = combine(
  {
    chains: $allChains,
    initiator: form.fields.initiator.$value,
  },
  ({ chains, initiator }) => {
    if (nullable(initiator)) return [];
    return chains.filter((chain) => {
      return accountService.isAccountAvailableOnChain(initiator, chain);
    });
  },
);

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

// flow setup

// Preselect initiator on form open
sample({
  clock: flow.open,
  source: {
    selectedWallet: walletSelect.$selectedWallet,
    allAccounts: walletModel.$availableAccounts,
    initiator: form.fields.initiator.$value,
  },
  fn: ({ selectedWallet, allAccounts, initiator }) => {
    if (nonNullable(initiator) || nullable(selectedWallet)) return initiator;

    const matchingAccount = allAccounts.find((account) =>
      selectedWallet.accounts.some((walletAccount) => walletAccount.accountId === account.accountId),
    );

    return (matchingAccount || allAccounts.at(0)) ?? null;
  },
  target: form.fields.initiator.change,
});

sample({
  clock: flow.open,
  source: {
    allChains: $allChains,
    selectedChain: form.fields.chain.$value,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ initiator, selectedChain }) =>
    nullable(selectedChain) ||
    (nonNullable(initiator) && accountService.isAccountAvailableOnChain(initiator, selectedChain)),
  fn: ({ allChains, initiator }) => {
    if (nullable(initiator)) return null;
    return allChains.find((chain) => accountService.isAccountAvailableOnChain(initiator, chain)) ?? null;
  },
  target: form.fields.chain.change,
});

sample({
  clock: form.fields.chain.change,
  source: {
    initiator: form.fields.initiator.$value,
    allAccounts: walletModel.$availableAccounts,
  },
  filter: ({ initiator }, chain) => {
    if (nullable(initiator) || nullable(chain)) return false;
    return !accountService.isAccountAvailableOnChain(initiator, chain);
  },
  fn: ({ initiator, allAccounts }, chain) => {
    if (nullable(initiator) || nullable(chain)) return null;

    const walletAccounts = accountService.filterAccountsByWallet(allAccounts, initiator.walletId);
    const matchingAccount = walletAccounts.find((account) => accountService.isAccountAvailableOnChain(account, chain));

    if (matchingAccount) {
      return matchingAccount;
    }

    return allAccounts.filter((a) => accountService.isAccountAvailableOnChain(a, chain))?.at(0) ?? null;
  },
  target: form.fields.initiator.change,
});

// Preselect signatory when initiator changes
sample({
  clock: [$signatories],
  source: {
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ selectedSignatory }, signatories) =>
    !selectedSignatory || !signatories.some((s) => s.accountId === selectedSignatory.accountId),
  fn: (_, signatories) => signatories.at(0) ?? null,
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
  $txErrors,
  $asset,
  $amount,
  $csvErrors,
  $allChains: $allChains,
  $availableChains: $availableChains,
  $signatories: $signatories,
  $showSignatories: $showSignatories,

  stepChanged,
  fileUploaded,
};
