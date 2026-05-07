import { type ApiPromise } from '@polkadot/api';
import { type Weight } from '@polkadot/types/interfaces';
import { BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { t } from 'i18next';
import { toast } from 'sonner';

import { type Chain, type ChainId, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, validateCallData } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type PathNode, HttpError, operationDescriptionsResource, operationsService } from '@/domains/backend';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { MAX_WEIGHT, getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { createPathRouteStore, graphModel } from '@/features/signing-path';

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

const $weight = createStore<Weight | null>(null);

const selectSignatory = createEvent<AnyAccount | null>();
const $signatory = restore<AnyAccount | null>(selectSignatory, null).reset(flow.open);

const setDescription = createEvent<string>();
const $description = createStore('').reset(flow.open);
$description.on(setDescription, (_, value) => value);

const $chain = flow.state.map(state => state.chain);
const $operation = flow.state.map(state => state.operation);
const $multisigAccount = flow.state.map(state => state.account);

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

    const signatories = accountsList.filter(a =>
      multisigAccount.signatories.some(s => s.accountId === a.accountId && (s.id ? s.id === a.walletId : true)),
    );

    const signatoriesOnChain = signatories.filter(s => accountService.isAccountAvailableOnChain(s, chain));

    const filteredSignatories = signatoriesOnChain.filter(
      a => !operation.events.some(e => e.accountId === a.accountId),
    );

    return filteredSignatories;
  },
);

const $isDepositRequired = $operation.map(operation => {
  if (nullable(operation)) return true;

  const approvalsCount = operation.events.filter(event => event.status === 'approve').length;

  return approvalsCount === 0;
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: $initiator,
  accounts: accounts.$list,
});

// signing path

const signingPathChanged = createEvent<PathNode[]>();
const $signingPath = createStore<PathNode[]>([])
  .on(signingPathChanged, (_, path) => path)
  .reset(flow.open);

const $userOverrodePath = createStore(false)
  .on(signingPathChanged, () => true)
  .reset(flow.open, selectInitiator);

const $chainIdForPath = $chain.map(c => c?.chainId ?? null);
const $defaultSigningPath = graphModel.$defaultPathFor($initiator, $chainIdForPath);

sample({
  clock: $defaultSigningPath,
  source: $userOverrodePath,
  filter: userOverrode => !userOverrode,
  fn: (_, defaultPath) => defaultPath,
  target: $signingPath,
});

const $signatoryFromPath = combine(
  { path: $signingPath, allAccounts: accounts.$list, chain: $chain },
  ({ path, allAccounts, chain }): AnyAccount | null => {
    if (nullable(chain)) return null;
    const last = path.at(-1);
    if (!last || last.kind !== 'signer') return null;
    return (
      allAccounts.find(a => a.accountId === last.accountId && accountService.isAccountAvailableOnChain(a, chain)) ??
      null
    );
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

// Dropdown → path sync.
sample({
  clock: $signatory,
  source: {
    initiator: $initiator,
    chain: $chain,
    currentPath: $signingPath,
    multisigByAccountId: graphModel.$multisigByAccountId,
    proxies: proxyModel.$proxies,
    ownSignerAccountIds: graphModel.$ownSignerAccountIds,
    resolveName: graphModel.$nameResolver,
  },
  filter: ({ initiator, chain, currentPath }, signatory) => {
    if (!initiator || !chain || !signatory) return false;
    const last = currentPath.at(-1);
    if (last && last.kind === 'signer' && last.accountId === signatory.accountId) return false;
    return accountUtils.isAnyMultisigAccount(initiator) || accountUtils.isProxiedAccount(initiator);
  },
  fn: ({ initiator, chain, multisigByAccountId, proxies, ownSignerAccountIds, resolveName }, signatory): PathNode[] => {
    return graphModel.pickDefaultPath({
      initiator: initiator!,
      chainId: chain!.chainId,
      multisigByAccountId,
      proxies,
      ownSignerAccountIds,
      resolveName,
      targetSigner: signatory!.accountId,
    });
  },
  target: signingPathChanged,
});

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

sample({
  clock: $operation,
  source: $api,
  filter: (api, operation) => nonNullable(api) && nonNullable(operation),
  fn: (api, operation) => ({ operation: operation!, api: api! }),
  target: getWeightFx,
});

sample({
  clock: getWeightFx.doneData,
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

const $pathRoute = createPathRouteStore($signingPath, $chain);

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
  const description =
    error instanceof HttpError && error.status === 403 ? t('addressBook.sources.errorForbidden') : error.message;
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
  selectSignatory,
  selectInitiator,
  setDescription,
  postDescription,
  signingPathChanged,
};
