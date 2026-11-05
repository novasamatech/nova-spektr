import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { t } from 'i18next';
import { toast } from 'sonner';

import { type Chain, type ChainId, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type RecipientCheck, getRecipientCheck } from '@/shared/lib/recipient-verification';
import { getNativeAsset, nonNullable, nullable, validateCallData } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { descriptionSaveErrorMessage, operationDescriptionsResource, operationsService } from '@/domains/backend';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { MAX_WEIGHT, getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { createSigningPathModel } from '@/features/signing-path';

type GetMultisigType = {
  chain: Chain | null;
  operation: MultisigOperation | null;
  account: MultisigAccount | FlexibleMultisigAccount | null;
};

const flow = createGate<GetMultisigType>({
  defaultState: { chain: null, operation: null, account: null },
});

const selectInitiator = createEvent<AnyAccount | null>();
const $initiator = restore<AnyAccount | null>(selectInitiator, null).reset(flow.open);

// The weight belongs to the open operation: a fresh flow never inherits one.
const $weight = createStore<Weight | null>(null).reset([flow.open, flow.close]);

const selectSignatory = createEvent<AnyAccount | null>();
const $signatory = restore<AnyAccount | null>(selectSignatory, null).reset(flow.open);

const setDescription = createEvent<string>();
const $description = createStore('').reset(flow.open);
$description.on(setDescription, (_, value) => value);

const $chain = flow.state.map(state => state.chain);
const $operation = flow.state.map(state => state.operation);
const $multisigAccount = flow.state.map(state => state.account);

// --- Unknown recipient gate ---

// Every account the operation's call pays, through batch and proxy wrappers.
// Call data that is there but did not decode can't be read, which warns like an
// unknown recipient. Without call data there is nothing to check yet — and no
// transaction to sign either.
const $recipientCheck = $operation.map((operation): RecipientCheck => {
  if (operation?.transaction) return getRecipientCheck(operation.transaction);

  return operation?.callData ? { kind: 'unresolved' } : { kind: 'no-recipient' };
});

const $recipientWarning = combine(
  recipientVerificationModel.$resolveCheckWarning,
  $recipientCheck,
  (resolveWarning, recipientCheck) => resolveWarning(recipientCheck),
);

const riskAcknowledgedToggled = createEvent<boolean>();

const $isRiskAcknowledged = createStore(false)
  .on(riskAcknowledgedToggled, (_, checked) => checked)
  .reset([flow.open, flow.close]);

const $recipientRiskAccepted = combine(
  $recipientWarning,
  $isRiskAcknowledged,
  (warning, acknowledged) => warning === 'none' || acknowledged,
);

// --- Signing step ---

const startSigning = createEvent();
const cancelSigning = createEvent();

const $isSigning = createStore(false).reset([cancelSigning, flow.open, flow.close]);

// Gated on the recipient acknowledgement, so the Sign button's `disabled` is
// not the only thing standing in the way.
sample({
  clock: startSigning,
  filter: $recipientRiskAccepted,
  fn: () => true,
  target: $isSigning,
});

const $api = combine(
  {
    apis: networkModel.$apis,
    chain: $chain,
  },
  ({ apis, chain }) => {
    if (nullable(chain?.chainId)) return null;

    return apis[chain.chainId] ?? null;
  },
);

const $unsignedAccounts = combine(
  {
    multisigAccount: $multisigAccount,
    chain: $chain,
    accountsList: accounts.$list,
    operation: $operation,
  },
  ({ multisigAccount, chain, accountsList, operation }) => {
    if (!multisigAccount || !chain || !operation) return [];

    return multisigOperationService.findActionableSignatories(operation, multisigAccount, accountsList, chain);
  },
);

const $isDepositRequired = $operation.map(operation => {
  if (nullable(operation)) return true;

  return multisigOperationService.getApprovalsCount(operation) === 0;
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: $initiator,
  accounts: accounts.$list,
});

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: $initiator,
    chain: $chain,
    resetOn: flow.open,
    resetUserOverrideOn: selectInitiator,
  },
);

sample({
  clock: $unsignedAccounts,
  filter: $unsignedAccounts.map(unsignedAccounts => unsignedAccounts.length === 1),
  fn: unsignedAccounts => unsignedAccounts.at(0) ?? null,
  target: $initiator,
});

sample({
  clock: [$signatoryFromPath, $signatories, flow.open],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: $signatory,
});

sample({ clock: $signatory, target: recomputeForSigner });

// Get weight
type ExtrinsicSigningPayload = {
  operation: MultisigOperation;
  api: ApiPromise;
};

const getWeightFx = createEffect(async ({ operation, api }: ExtrinsicSigningPayload) => {
  if (!operation.callData) return null;

  try {
    const weight = await transactionService.getTransactionWeight(
      { type: 'encoded', callData: operation.callData },
      api,
    );
    return weight;
  } catch {
    return api.createType('Weight', MAX_WEIGHT);
  }
});

// Every open fetches the weight again — `$weight` was just reset.
sample({
  clock: flow.open,
  source: $api,
  filter: (api, { operation }) => nonNullable(api) && nonNullable(operation),
  fn: (api, { operation }) => ({ operation: operation!, api: api! }),
  target: getWeightFx,
});

// A result that arrives for an operation other than the open one is dropped.
sample({
  clock: getWeightFx.done,
  source: $operation,
  filter: (operation, { params }) => operation === params.operation,
  fn: (_, { result }) => result,
  target: $weight,
});

const $transaction = combine(
  {
    multisigAccount: $multisigAccount,
    signatory: $signatory,
    initiator: $initiator,
    chain: $chain,
    operation: $operation,
    weight: $weight,
  },
  ({ multisigAccount, chain, operation, signatory, weight, initiator }) => {
    if (!multisigAccount || !operation || !chain || !signatory || !weight || !initiator) return null;

    const otherSignatories = multisigOperationService.getOtherSignatories(multisigAccount, initiator.accountId);
    const hasCallData = operation.callData && validateCallData(operation.callData, operation.callHash);

    return transactionBuilder.buildApproveMultisigTx({
      chain,
      signerAccountId: signatory.accountId,
      threshold: multisigAccount.threshold,
      otherSignatories,
      tx: operation,
      hasCallData: !!hasCallData,
      maxWeight: weight,
    });
  },
);

const {
  $tx,
  $route,
  $fee,
  $pendingFee: $isFeeLoading,
} = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $transaction,
  routeOverride: $pathRoute,
});

const $extrinsic = combine($api, $tx, (api, tx) => {
  if (nullable(api) || nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const $signingPayloads = combine(
  { api: $api, chain: $chain, extrinsic: $extrinsic, signatory: $signatory },
  ({ api, chain, extrinsic, signatory }) => {
    if (nullable(api) || nullable(chain) || nullable(extrinsic) || nullable(signatory)) return null;
    return [{ api, chain, extrinsic, signatory }];
  },
);

const validator = createTxValidator();
const { $errors, $valid, $balanceValidationResults } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $chain.map(chain => (chain ? getNativeAsset(chain.assets) : null)),
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $multisigDeposit = combine({ results: $balanceValidationResults }, ({ results }) => {
  const actions = getActionRequiredAmount(results, 'multisig deposit');
  return actions.reduce((deposit, action) => deposit.add(action.required), BN_ZERO);
});

const $canSubmit = combine(
  {
    valid: $valid,
    isFeeLoading: $isFeeLoading,
    signatory: $signatory,
    isDepositRequired: $isDepositRequired,
    multisigDeposit: $multisigDeposit,
  },
  ({ valid, isFeeLoading, signatory, isDepositRequired, multisigDeposit }) => {
    if (!nonNullable(signatory)) return false;

    const isDepositReady = !isDepositRequired || !multisigDeposit.isZero();

    return valid && !isFeeLoading && isDepositReady;
  },
);

// --- Description posting ---

type PostDescriptionParams = {
  operation: MultisigOperation;
  chainId: ChainId;
  description: string;
};

const postDescription = createEvent<PostDescriptionParams>();

const postDescriptionFx = createEffect(
  async (params: {
    baseUrl: string;
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  }) => {
    const { baseUrl, ...body } = params;
    await operationsService.createDescription(baseUrl, body);
  },
);

sample({
  clock: postDescription,
  source: {
    baseUrl: backendConfigurationModel.$backendUrl,
    isAuthenticated: authModel.$isAuthenticated,
  },
  filter: ({ baseUrl, isAuthenticated }, { description }) =>
    nonNullable(baseUrl) && isAuthenticated && description.length > 0,
  fn: ({ baseUrl }, { operation, chainId, description }) => ({
    baseUrl: baseUrl!,
    multisigAccountId: operation.multisigAccountId,
    chainId,
    callHash: operation.callHash,
    blockNumber: operation.blockCreated,
    extrinsicIndex: operation.indexCreated,
    description,
  }),
  target: postDescriptionFx,
});

const showDescriptionErrorFx = createEffect((error: Error) => {
  const description = descriptionSaveErrorMessage(error, t);
  toast.error(t('operation.descriptionSaveError'), { description });
});

sample({
  clock: postDescriptionFx.failData,
  target: showDescriptionErrorFx,
});

sample({
  clock: postDescriptionFx.done,
  source: $operation,
  filter: (operation): operation is MultisigOperation => nonNullable(operation),
  fn: (operation, { params }) => ({
    id: operation!.id,
    description: params.description,
  }),
  target: operationDescriptionsResource.descriptionCreated,
});

export const approveModel = {
  flow,
  $transaction: $tx,
  $fee,
  $isFeeLoading,
  $errors,
  $multisigDeposit,
  $isDepositRequired,
  $multisigAccount,
  $signatory,
  $signingPayloads,
  $initiator,
  $unsignedAccounts,
  $canSubmit,
  $valid,

  $signatories,
  $signingPath,
  $description,
  $recipientWarning,
  $isRiskAcknowledged,
  $isSigning,
  selectSignatory,
  selectInitiator,
  setDescription,
  postDescription,
  signingPathChanged,
  riskAcknowledgedToggled,
  startSigning,
  cancelSigning,
};
