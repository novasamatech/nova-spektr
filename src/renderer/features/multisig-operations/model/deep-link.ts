import { combine, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';
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

const multisigOperationDeepLinkHandler = deepLinkService.createDeepLinkHandler({
  schema: multisigOperationSchema,
});

// Core events
const setFocusedOperationId = createEvent<string | null>();
const operationsPageClosed = createEvent();
const processDeepLink = createEvent<MultisigOperationDeepLinkData>();

// Modal events
const alreadySignedModalOpened = createEvent();
const closeAlreadySignedModal = createEvent();
const viewAlreadySignedOperation = createEvent();

const accountNotFoundModalOpened = createEvent();
const closeNotFoundModal = createEvent();

const networkNotAvailableModalOpened = createEvent();
const closeNetworkNotAvailableModal = createEvent();

const operationNotFoundModalOpened = createEvent();
const closeOperationNotFoundModal = createEvent();

const connectionTimeoutModalOpened = createEvent();
const closeConnectionTimeoutModal = createEvent();
const retryConnectionTimeout = createEvent();

// Modal stores (all follow same pattern: open on opened, close on close/extra events, reset on page close or new deep link)
const $isAlreadySignedModalOpen = createStore(false)
  .on(alreadySignedModalOpened, () => true)
  .on(closeAlreadySignedModal, () => false)
  .on(viewAlreadySignedOperation, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isAccountNotFoundModalOpen = createStore(false)
  .on(accountNotFoundModalOpened, () => true)
  .on(closeNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isNetworkNotAvailableModalOpen = createStore(false)
  .on(networkNotAvailableModalOpened, () => true)
  .on(closeNetworkNotAvailableModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isOperationNotFoundModalOpen = createStore(false)
  .on(operationNotFoundModalOpened, () => true)
  .on(closeOperationNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $isConnectionTimeoutModalOpen = createStore(false)
  .on(connectionTimeoutModalOpened, () => true)
  .on(closeConnectionTimeoutModal, () => false)
  .on(retryConnectionTimeout, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

// Core state
const $deepLinkData = createStore<MultisigOperationDeepLinkData | null>(null)
  .on(multisigOperationDeepLinkHandler.triggered, (_, data) => data)
  .reset(operationsPageClosed);

const $operationId = createStore<string | null>(null)
  .on(setFocusedOperationId, (_, v) => v)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $focusedOperationId = createStore<string | null>(null).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
);

const $dataReady = combine(accounts.$populated, networkModel.$populated, (a, b) => a && b);

const $focusedOperation = combine(
  $operationId,
  multisigOperation.$list,
  (id, list) => list.find(item => item.id === id) ?? null,
);

const $networkData = createStore<{ data: MultisigOperationDeepLinkData; network: Chain } | null>(null).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
);

const $pendingOperationId = createStore<string | null>(null).reset(operationsPageClosed);

const $isDeepLinkLoading = createStore(false)
  .on($focusedOperation.updates, (state, op) => (nonNullable(op) ? false : state))
  .reset(
    operationsPageClosed,
    multisigOperationDeepLinkHandler.triggered,
    operationNotFoundModalOpened,
    alreadySignedModalOpened,
    connectionTimeoutModalOpened,
    accountNotFoundModalOpened,
    networkNotAvailableModalOpened,
  );

// Deep link processing flow
sample({ clock: multisigOperationDeepLinkHandler.triggered, target: processDeepLink });
sample({ clock: retryConnectionTimeout, source: $deepLinkData, filter: nonNullable, target: processDeepLink });

// Handle "already signed" modal flow
sample({
  clock: setFocusedOperationId,
  source: $focusedOperation,
  filter: op => nonNullable(op) && op.status === 'executed',
  target: alreadySignedModalOpened,
});

sample({
  clock: setFocusedOperationId,
  source: { op: $focusedOperation, id: $operationId },
  filter: ({ op }) => nullable(op) || op.status !== 'executed',
  fn: ({ id }) => id,
  target: $focusedOperationId,
});

sample({ clock: viewAlreadySignedOperation, source: $operationId, target: $focusedOperationId });

// Validation result type
type ValidationResult =
  | { type: 'networkNotAvailable' }
  | { type: 'accountNotFound' }
  | { type: 'valid'; operationId: string; exists: boolean };

function validateDeepLink(
  data: MultisigOperationDeepLinkData,
  chains: Record<ChainId, Chain>,
  accountsList: ReturnType<typeof accounts.$list.getState>,
  operations: ReturnType<typeof multisigOperation.$list.getState>,
): ValidationResult {
  if (nullable(chains[data.chainId])) return { type: 'networkNotAvailable' };

  const account = accountsList.find(acc => accountUtils.isAnyMultisigAccount(acc) && acc.accountId === data.accountId);
  if (nullable(account)) return { type: 'accountNotFound' };

  const operationId = getOperationIdFromDeepLink(data);
  return { type: 'valid', operationId, exists: operations.some(op => op.id === operationId) };
}

// Unified validation on deep link or when data becomes ready
const validated = sample({
  clock: [processDeepLink, $dataReady],
  source: {
    data: $deepLinkData,
    ready: $dataReady,
    opId: $operationId,
    chains: networkModel.$chains,
    accs: accounts.$list,
    ops: multisigOperation.$list,
  },
  filter: ({ data, ready, opId }) => nonNullable(data) && ready && nullable(opId),
  fn: ({ data, chains, accs, ops }) => validateDeepLink(data!, chains, accs, ops),
});

sample({
  clock: validated,
  filter: (r): r is { type: 'networkNotAvailable' } => r.type === 'networkNotAvailable',
  target: networkNotAvailableModalOpened,
});

sample({
  clock: validated,
  filter: (r): r is { type: 'accountNotFound' } => r.type === 'accountNotFound',
  target: accountNotFoundModalOpened,
});

sample({
  clock: validated,
  filter: (r): r is Extract<ValidationResult, { type: 'valid' }> => r.type === 'valid' && r.exists,
  fn: (r: Extract<ValidationResult, { type: 'valid' }>) => r.operationId,
  target: setFocusedOperationId,
});

$isDeepLinkLoading.on(validated, (_, r) => r.type === 'valid' && !r.exists);

// Network connection handling
const networkReady = sample({
  clock: [processDeepLink, networkModel.$populated, networkModel.output.connectionStatusChanged],
  source: {
    chains: networkModel.$chains,
    statuses: networkModel.$connectionStatuses,
    data: $deepLinkData,
    opId: $operationId,
  },
  filter: ({ data, chains, statuses, opId }) => {
    if (nullable(data) || nonNullable(opId)) return false;
    return nonNullable(chains[data.chainId]) && statuses[data.chainId] === ConnectionStatus.CONNECTED;
  },
  fn: ({ chains, data }) => ({ data: data!, network: chains[data!.chainId] }),
});

$networkData.on(networkReady, (_, d) => d);

const connectionWaitingStarted = sample({
  clock: processDeepLink,
  source: { chains: networkModel.$chains, statuses: networkModel.$connectionStatuses },
  filter: ({ chains, statuses }, data) => {
    const chain = chains[data.chainId];
    if (nullable(chain)) return false;
    const status = statuses[data.chainId];
    return status !== ConnectionStatus.CONNECTED && status !== ConnectionStatus.ERROR;
  },
});

sample({
  clock: delay({ source: connectionWaitingStarted, timeout: CONNECTION_TIMEOUT }),
  source: $operationId,
  filter: nullable,
  target: connectionTimeoutModalOpened,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: $deepLinkData,
  filter: (data, { chainId, status }) =>
    nonNullable(data) && data.chainId === chainId && status === ConnectionStatus.ERROR,
  target: connectionTimeoutModalOpened,
});

// Account verification after network is ready
const accountChecked = sample({
  clock: [networkReady, accounts.$populated, multisigOperation.$populated],
  source: {
    netData: $networkData,
    accs: accounts.$list,
    accsReady: accounts.$populated,
    opsReady: multisigOperation.$populated,
  },
  filter: ({ netData, accs, accsReady, opsReady }) =>
    nonNullable(netData?.network) && accsReady && opsReady && accs.some(a => a.accountId === netData!.data.accountId),
  fn: ({ accs, netData }) => {
    const account = accs.filter(accountUtils.isAnyMultisigAccount).find(a => a.accountId === netData!.data.accountId);
    return {
      data: netData!.data,
      multisigAccountId: account ? multisigService.getMultisigAccountId(account) : null,
    };
  },
});

sample({
  clock: accountChecked,
  source: $operationId,
  filter: (opId, { multisigAccountId }) => nonNullable(multisigAccountId) && nullable(opId),
  fn: (_, { data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: setFocusedOperationId,
});

// Wait for operation to load if not immediately available
sample({
  clock: accountChecked,
  source: {
    ops: multisigOperation.$list,
    opsReady: multisigOperation.$populated,
    loadingDone: multisigOperation.$initialLoadingComplete,
  },
  filter: ({ opsReady, loadingDone, ops }, { multisigAccountId, data }) => {
    if (!opsReady || nullable(multisigAccountId)) return false;
    const opId = getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId });
    return !ops.some(op => op.id === opId) && !loadingDone;
  },
  fn: (_, { data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: $pendingOperationId,
});

sample({
  clock: multisigOperation.$initialLoadingComplete,
  source: { pendingId: $pendingOperationId, ops: multisigOperation.$list },
  filter: ({ pendingId, ops }, done) => done && nonNullable(pendingId) && !ops.some(op => op.id === pendingId),
  target: operationNotFoundModalOpened,
});

sample({
  clock: multisigOperation.$initialLoadingComplete,
  source: { pendingId: $pendingOperationId, ops: multisigOperation.$list },
  filter: ({ pendingId, ops }, done) => done && nonNullable(pendingId) && ops.some(op => op.id === pendingId),
  fn: ({ pendingId }) => pendingId,
  target: setFocusedOperationId,
});

// Helper functions
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
