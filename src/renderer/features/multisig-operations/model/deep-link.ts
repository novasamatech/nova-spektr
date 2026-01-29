import { combine, createEvent, createStore, sample } from 'effector';
import { and, delay } from 'patronum';
import { z } from 'zod';

import {
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  ConnectionStatus,
} from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { deepLinkService } from '@/domains/app';
import { accounts, multisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';

import { CONNECTION_TIMEOUT } from './constants';

export const multisigOperationSchema = z.object({
  chainId: z.string().transform(x => x as ChainId),
  callHash: z.string(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  blockCreated: z.string().transform(Number),
  indexCreated: z.string().transform(Number),
});

export type MultisigOperationDeepLinkData = z.infer<typeof multisigOperationSchema>;

type ValidationResult =
  | { type: 'chainNotFound' }
  | { type: 'accountNotFound' }
  | { type: 'valid'; operationId: string; operationInCache: boolean };

const multisigOperationDeepLinkHandler = deepLinkService.createDeepLinkHandler({
  schema: multisigOperationSchema,
});

const setFocusedOperationId = createEvent<string | null>();
const operationsPageClosed = createEvent();
const closeAlreadySignedModal = createEvent();
const viewAlreadySignedOperation = createEvent();
const closeNotFoundModal = createEvent();
const closeNetworkNotAvailableModal = createEvent();
const closeOperationNotFoundModal = createEvent();
const closeConnectionTimeoutModal = createEvent();
const retryConnectionTimeout = createEvent();

const startDeepLinkFlow = createEvent<MultisigOperationDeepLinkData>();
const openAlreadySignedModal = createEvent();
const openAccountNotFoundModal = createEvent();
const openChainNotFoundModal = createEvent();
const openOperationNotFoundModal = createEvent();
const openConnectionTimeoutModal = createEvent();

const $isAlreadySignedModalOpen = createStore(false)
  .on(openAlreadySignedModal, () => true)
  .on(closeAlreadySignedModal, () => false)
  .on(viewAlreadySignedOperation, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isAccountNotFoundModalOpen = createStore(false)
  .on(openAccountNotFoundModal, () => true)
  .on(closeNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isNetworkNotAvailableModalOpen = createStore(false)
  .on(openChainNotFoundModal, () => true)
  .on(closeNetworkNotAvailableModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isOperationNotFoundModalOpen = createStore(false)
  .on(openOperationNotFoundModal, () => true)
  .on(closeOperationNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isConnectionTimeoutModalOpen = createStore(false)
  .on(openConnectionTimeoutModal, () => true)
  .on(closeConnectionTimeoutModal, () => false)
  .on(retryConnectionTimeout, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $deepLinkData = createStore<MultisigOperationDeepLinkData | null>(null)
  .on(multisigOperationDeepLinkHandler.triggered, (_, data) => data)
  .reset(operationsPageClosed);

const $targetOperationId = createStore<string | null>(null)
  .on(setFocusedOperationId, (_, id) => id)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $focusedOperationId = createStore<string | null>(null).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
);

const $operationIdAwaitingFetch = createStore<string | null>(null).reset(operationsPageClosed);

const $connectedChainInfo = createStore<{ data: MultisigOperationDeepLinkData; chain: Chain } | null>(null).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
);

const $isDeepLinkLoading = createStore(false).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
  openOperationNotFoundModal,
  openAlreadySignedModal,
  openConnectionTimeoutModal,
  openAccountNotFoundModal,
  openChainNotFoundModal,
);

const $targetOperation = combine(
  $targetOperationId,
  multisigOperation.$list,
  (id, list) => list.find(op => op.id === id) ?? null,
);

$isDeepLinkLoading.on($targetOperation.updates, (isLoading, op) => (nonNullable(op) ? false : isLoading));

sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  target: startDeepLinkFlow,
});

sample({
  clock: retryConnectionTimeout,
  source: $deepLinkData,
  filter: nonNullable,
  target: startDeepLinkFlow,
});

const $canRunValidation = and(accounts.$populated, networkModel.$populated);

function validateDeepLink(
  data: MultisigOperationDeepLinkData,
  chains: Record<ChainId, Chain>,
  accountsList: ReturnType<typeof accounts.$list.getState>,
  operations: ReturnType<typeof multisigOperation.$list.getState>,
): ValidationResult {
  if (nullable(chains[data.chainId])) {
    return { type: 'chainNotFound' };
  }

  const account = accountsList.find(acc => accountUtils.isAnyMultisigAccount(acc) && acc.accountId === data.accountId);
  if (nullable(account)) {
    return { type: 'accountNotFound' };
  }

  const operationId = getOperationIdFromDeepLink(data);
  const operationInCache = operations.some(op => op.id === operationId);

  return { type: 'valid', operationId, operationInCache };
}

const validationResult = sample({
  clock: [startDeepLinkFlow, $canRunValidation],
  source: {
    data: $deepLinkData,
    canValidate: $canRunValidation,
    alreadyResolved: $targetOperationId,
    chains: networkModel.$chains,
    accountsList: accounts.$list,
    operationsList: multisigOperation.$list,
  },
  filter: ({ data, canValidate, alreadyResolved }) => nonNullable(data) && canValidate && nullable(alreadyResolved),
  fn: ({ data, chains, accountsList, operationsList }) => validateDeepLink(data!, chains, accountsList, operationsList),
});

sample({
  clock: validationResult,
  filter: (r): r is { type: 'chainNotFound' } => r.type === 'chainNotFound',
  target: openChainNotFoundModal,
});

sample({
  clock: validationResult,
  filter: (r): r is { type: 'accountNotFound' } => r.type === 'accountNotFound',
  target: openAccountNotFoundModal,
});

sample({
  clock: validationResult,
  filter: (r): r is Extract<ValidationResult, { type: 'valid' }> => r.type === 'valid' && r.operationInCache,
  fn: (r: Extract<ValidationResult, { type: 'valid' }>) => r.operationId,
  target: setFocusedOperationId,
});

$isDeepLinkLoading.on(validationResult, (_, r) => r.type === 'valid' && !r.operationInCache);

const chainConnected = sample({
  clock: [startDeepLinkFlow, networkModel.$populated, networkModel.output.connectionStatusChanged],
  source: {
    chains: networkModel.$chains,
    connectionStatuses: networkModel.$connectionStatuses,
    data: $deepLinkData,
    alreadyResolved: $targetOperationId,
  },
  filter: ({ data, chains, connectionStatuses, alreadyResolved }) => {
    if (nullable(data) || nonNullable(alreadyResolved)) return false;

    const chainExists = nonNullable(chains[data.chainId]);
    const isChainConnected = connectionStatuses[data.chainId] === ConnectionStatus.CONNECTED;

    return chainExists && isChainConnected;
  },
  fn: ({ chains, data }) => ({ data: data!, chain: chains[data!.chainId] }),
});

$connectedChainInfo.on(chainConnected, (_, info) => info);

const startedWaitingForConnection = sample({
  clock: startDeepLinkFlow,
  source: {
    chains: networkModel.$chains,
    connectionStatuses: networkModel.$connectionStatuses,
  },
  filter: ({ chains, connectionStatuses }, data) => {
    const chain = chains[data.chainId];
    if (nullable(chain)) return false;

    const status = connectionStatuses[data.chainId];

    return status !== ConnectionStatus.CONNECTED && status !== ConnectionStatus.ERROR;
  },
});

sample({
  clock: delay({ source: startedWaitingForConnection, timeout: CONNECTION_TIMEOUT }),
  source: $targetOperationId,
  filter: nullable,
  target: openConnectionTimeoutModal,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: $deepLinkData,
  filter: (data, { chainId, status }) =>
    nonNullable(data) && data.chainId === chainId && status === ConnectionStatus.ERROR,
  target: openConnectionTimeoutModal,
});

const multisigAccountResolved = sample({
  clock: [chainConnected, accounts.$populated, multisigOperation.$populated],
  source: {
    chainInfo: $connectedChainInfo,
    accountsList: accounts.$list,
    accountsReady: accounts.$populated,
    operationsReady: multisigOperation.$populated,
  },
  filter: ({ chainInfo, accountsList, accountsReady, operationsReady }) =>
    nonNullable(chainInfo?.chain) &&
    accountsReady &&
    operationsReady &&
    accountsList.some(a => a.accountId === chainInfo!.data.accountId),
  fn: ({ accountsList, chainInfo }) => {
    const account = accountsList
      .filter(accountUtils.isAnyMultisigAccount)
      .find(a => a.accountId === chainInfo!.data.accountId);

    return {
      data: chainInfo!.data,
      multisigAccountId: account ? multisigService.getMultisigAccountId(account) : null,
    };
  },
});

sample({
  clock: multisigAccountResolved,
  source: $targetOperationId,
  filter: (alreadyResolved, { multisigAccountId }) => nonNullable(multisigAccountId) && nullable(alreadyResolved),
  fn: (_, { data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: setFocusedOperationId,
});

sample({
  clock: multisigAccountResolved,
  source: {
    operationsList: multisigOperation.$list,
    operationsReady: multisigOperation.$populated,
    fetchComplete: multisigOperation.$initialLoadingComplete,
  },
  filter: ({ operationsReady, fetchComplete, operationsList }, { multisigAccountId, data }) => {
    if (!operationsReady || nullable(multisigAccountId)) return false;

    const operationId = getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId });
    const operationExists = operationsList.some(op => op.id === operationId);

    return !operationExists && !fetchComplete;
  },
  fn: (_, { data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: $operationIdAwaitingFetch,
});

sample({
  clock: multisigOperation.$initialLoadingComplete,
  source: {
    awaitingId: $operationIdAwaitingFetch,
    operationsList: multisigOperation.$list,
  },
  filter: ({ awaitingId, operationsList }, fetchComplete) =>
    fetchComplete && nonNullable(awaitingId) && !operationsList.some(op => op.id === awaitingId),
  target: openOperationNotFoundModal,
});

sample({
  clock: multisigOperation.$initialLoadingComplete,
  source: {
    awaitingId: $operationIdAwaitingFetch,
    operationsList: multisigOperation.$list,
  },
  filter: ({ awaitingId, operationsList }, fetchComplete) =>
    fetchComplete && nonNullable(awaitingId) && operationsList.some(op => op.id === awaitingId),
  fn: ({ awaitingId }) => awaitingId,
  target: setFocusedOperationId,
});

sample({
  clock: setFocusedOperationId,
  source: $targetOperation,
  filter: op => nonNullable(op) && op.status === 'executed',
  target: openAlreadySignedModal,
});

sample({
  clock: setFocusedOperationId,
  source: { operation: $targetOperation, targetId: $targetOperationId },
  filter: ({ operation }) => nullable(operation) || operation.status !== 'executed',
  fn: ({ targetId }) => targetId,
  target: $focusedOperationId,
});

sample({
  clock: viewAlreadySignedOperation,
  source: $targetOperationId,
  target: $focusedOperationId,
});

function generateMultisigOperationDeepLink(
  operation: MultisigOperationDeepLinkData,
  account: MultisigAccount | FlexibleMultisigAccount,
): string {
  return multisigOperationService.generateMultisigOperationDeepLink({
    chainId: operation.chainId,
    callHash: operation.callHash,
    accountId: account.accountId,
    blockCreated: operation.blockCreated,
    indexCreated: operation.indexCreated,
  });
}

export function getOperationIdFromDeepLink(data: MultisigOperationDeepLinkData): string {
  return multisigOperationService.getOperationId(
    data.chainId,
    data.callHash,
    data.accountId,
    data.blockCreated,
    data.indexCreated,
  );
}

export const deepLinkModel = {
  $focusedOperationId,
  $isDeepLinkLoading,

  setFocusedOperationId,
  operationsPageClosed,

  $isAccountNotFoundModalOpen,
  closeNotFoundModal,

  $isNetworkNotAvailableModalOpen,
  closeNetworkNotAvailableModal,

  $isOperationNotFoundModalOpen,
  closeOperationNotFoundModal,

  $isConnectionTimeoutModalOpen,
  closeConnectionTimeoutModal,
  retryConnectionTimeout,

  $isAlreadySignedModalOpen,
  closeAlreadySignedModal,
  viewAlreadySignedOperation,

  generateMultisigOperationDeepLink,
  multisigOperationDeepLinkHandler,
};
