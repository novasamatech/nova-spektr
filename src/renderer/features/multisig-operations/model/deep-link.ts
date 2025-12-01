import { combine, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';
import { z } from 'zod';

import {
  type Chain,
  type ChainId,
  ConnectionStatus,
  type FlexibleMultisigAccount,
  type MultisigAccount,
} from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { deepLinkService } from '@/domains/app';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
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

const setFocusedOperationId = createEvent<string | null>();
const operationsPageClosed = createEvent();

const $operationId = createStore<string | null>(null)
  .on(setFocusedOperationId, (_, v) => v)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const $focusedOperation = combine({
  operationId: $operationId,
  list: multisigOperation.$list,
}).map(({ operationId, list }) => list.find(item => item.id === operationId) ?? null);

const $focusedOperationId = createStore<string | null>(null).reset(
  operationsPageClosed,
  multisigOperationDeepLinkHandler.triggered,
);

const alreadySignedModalOpened = createEvent();
const closeAlreadySignedModal = createEvent();
const viewAlreadySignedOperation = createEvent();
const $isAlreadySignedModalOpen = createStore(false)
  .on(alreadySignedModalOpened, () => true)
  .on(closeAlreadySignedModal, () => false)
  .on(viewAlreadySignedOperation, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const accountNotFoundModalOpened = createEvent();
const closeNotFoundModal = createEvent();
const $isAccountNotFoundModalOpen = createStore(false)
  .on(accountNotFoundModalOpened, () => true)
  .on(closeNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const networkNotAvailableModalOpened = createEvent();
const closeNetworkNotAvailableModal = createEvent();
const $isNetworkNotAvailableModalOpen = createStore(false)
  .on(networkNotAvailableModalOpened, () => true)
  .on(closeNetworkNotAvailableModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const operationNotFoundModalOpened = createEvent();
const closeOperationNotFoundModal = createEvent();
const $isOperationNotFoundModalOpen = createStore(false)
  .on(operationNotFoundModalOpened, () => true)
  .on(closeOperationNotFoundModal, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const connectionTimeoutModalOpened = createEvent();
const closeConnectionTimeoutModal = createEvent();
const retryConnectionTimeout = createEvent();
const $isConnectionTimeoutModalOpen = createStore(false)
  .on(connectionTimeoutModalOpened, () => true)
  .on(closeConnectionTimeoutModal, () => false)
  .on(retryConnectionTimeout, () => false)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

sample({
  clock: setFocusedOperationId,
  source: $focusedOperation,
  filter: operation => nonNullable(operation) && operation.status === 'executed',
  target: alreadySignedModalOpened,
});

sample({
  clock: setFocusedOperationId,
  source: { operation: $focusedOperation, id: $operationId },
  filter: ({ operation }) => !nonNullable(operation) || operation.status !== 'executed',
  fn: ({ id }) => id,
  target: $focusedOperationId,
});

sample({
  clock: viewAlreadySignedOperation,
  source: $operationId,
  target: $focusedOperationId,
});

const processDeepLink = createEvent<MultisigOperationDeepLinkData>();

const $deepLinkData = createStore<MultisigOperationDeepLinkData | null>(null)
  .on(multisigOperationDeepLinkHandler.triggered, (_, data) => data)
  .reset(operationsPageClosed);

sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  target: processDeepLink,
});

sample({
  clock: retryConnectionTimeout,
  source: $deepLinkData,
  filter: nonNullable,
  target: processDeepLink,
});

const operationExistsCheck = sample({
  clock: processDeepLink,
  source: { operations: multisigOperation.$list, accounts: accounts.$list, chains: networkModel.$chains },
  filter: ({ chains, accounts }, data) => {
    const chain = chains[data.chainId];
    if (nullable(chain)) return false;

    const account = accounts.find(acc => accountUtils.isAnyMultisigAccount(acc) && acc.accountId === data.accountId);
    return nonNullable(account);
  },
  fn: ({ operations, accounts }, data) => {
    const operationId = getOperationIdFromDeepLink(data);
    const operation = operations.find(op => op.id === operationId);
    const account = accounts.find(acc => accountUtils.isAnyMultisigAccount(acc) && acc.accountId === data.accountId);
    return {
      data,
      operationId,
      exists: nonNullable(operation),
      isExecuted: operation?.status === 'executed',
      walletId: account!.walletId,
    };
  },
});

sample({
  clock: operationExistsCheck,
  filter: ({ exists }) => exists,
  fn: ({ operationId }) => operationId,
  target: setFocusedOperationId,
});

sample({
  clock: operationExistsCheck,
  filter: ({ exists, walletId }) => exists && nonNullable(walletId),
  fn: ({ walletId }) => walletId!,
  target: walletSelect.select,
});

const $isDeepLinkLoading = createStore(false)
  .on(operationExistsCheck, (_, { exists }) => !exists)
  .on($focusedOperationId.updates, () => false)
  .reset(operationsPageClosed);

sample({
  clock: processDeepLink,
  source: { chains: networkModel.$chains },
  filter: ({ chains }, data) => {
    const chain = chains[data.chainId];
    return nullable(chain);
  },
  target: networkNotAvailableModalOpened,
});

sample({
  clock: processDeepLink,
  source: {
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ chains, accounts }, data) => {
    const chain = chains[data.chainId];
    if (nullable(chain)) return false;

    const account = accounts.find(acc => accountUtils.isAnyMultisigAccount(acc) && acc.accountId === data.accountId);
    return nullable(account);
  },
  target: accountNotFoundModalOpened,
});

const networkReady = sample({
  clock: [processDeepLink, networkModel.$populated, networkModel.output.connectionStatusChanged],
  source: {
    chains: networkModel.$chains,
    connectionStatuses: networkModel.$connectionStatuses,
    data: $deepLinkData,
    operationId: $operationId,
  },
  filter: ({ data, chains, connectionStatuses, operationId }) => {
    if (nullable(data)) return false;
    if (nonNullable(operationId)) return false;

    const network = chains[data.chainId];
    if (nullable(network)) return false;

    return connectionStatuses[data.chainId] === ConnectionStatus.CONNECTED;
  },
  fn: ({ chains, data }) => ({
    data: data!,
    network: chains[data!.chainId],
  }),
});

const $networkData = createStore<{ data: MultisigOperationDeepLinkData; network: Chain } | null>(null)
  .on(networkReady, (_, data) => data)
  .reset(operationsPageClosed, multisigOperationDeepLinkHandler.triggered);

const connectionWaitingStarted = sample({
  clock: processDeepLink,
  source: { chains: networkModel.$chains, connectionStatuses: networkModel.$connectionStatuses },
  filter: ({ chains, connectionStatuses }, data) => {
    const chain = chains[data.chainId];
    if (nullable(chain)) return false;
    const status = connectionStatuses[data.chainId];
    return status !== ConnectionStatus.CONNECTED && status !== ConnectionStatus.ERROR;
  },
});

const connectionTimeoutTriggered = delay({
  source: connectionWaitingStarted,
  timeout: CONNECTION_TIMEOUT,
});

sample({
  clock: connectionTimeoutTriggered,
  source: $operationId,
  filter: operationId => nullable(operationId),
  target: connectionTimeoutModalOpened,
});

sample({
  clock: networkModel.output.connectionStatusChanged,
  source: $deepLinkData,
  filter: (deepLinkData, { chainId, status }) =>
    nonNullable(deepLinkData) && deepLinkData.chainId === chainId && status === ConnectionStatus.ERROR,
  target: connectionTimeoutModalOpened,
});

const accountChecked = sample({
  clock: [networkReady, accounts.$populated, multisigOperation.$populated],
  source: {
    networkData: $networkData,
    accountsList: accounts.$list,
    accountsPopulated: accounts.$populated,
    operationsPopulated: multisigOperation.$populated,
  },
  filter: ({ networkData, accountsList, accountsPopulated, operationsPopulated }) => {
    if (nullable(networkData) || nullable(networkData.network)) return false;
    if (!accountsPopulated || !operationsPopulated) return false;

    const account = accountsList.find(acc => acc.accountId === networkData.data.accountId);
    return nonNullable(account);
  },
  fn: ({ accountsList, networkData }) => {
    const { data } = networkData!;
    const account = accountsList
      .filter(accountUtils.isAnyMultisigAccount)
      .find(acc => acc.accountId === data.accountId);
    const multisigAccountId = account ? multisigService.getMultisigAccountId(account) : null;
    return {
      data,
      account: account!,
      multisigAccountId,
    };
  },
});

sample({
  clock: accountChecked,
  fn: ({ account }) => account.walletId,
  target: walletSelect.select,
});

sample({
  clock: accountChecked,
  source: $operationId,
  filter: (operationId, { multisigAccountId }) => nonNullable(multisigAccountId) && nullable(operationId),
  fn: (_, { data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: setFocusedOperationId,
});

const operationFetchRequested = sample({
  clock: accountChecked,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
    operations: multisigOperation.$list,
    operationsPopulated: multisigOperation.$populated,
  },
  filter: ({ operations, operationsPopulated }, { multisigAccountId, data }) => {
    if (!operationsPopulated) return false;
    if (nullable(multisigAccountId)) return false;
    const operationId = getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId });
    const operationExists = operations.some(op => op.id === operationId);
    return !operationExists;
  },
  fn: ({ apis, chains }, { data, multisigAccountId }) => ({
    apis,
    chains,
    accountId: multisigAccountId!,
    operationId: getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  }),
});

sample({
  clock: operationFetchRequested,
  fn: ({ apis, chains, accountId }) => ({ apis, chains, accountId }),
  target: multisigOperation.requestOperations,
});

const $pendingOperationId = createStore<string | null>(null)
  .on(operationFetchRequested, (_, req) => req.operationId)
  .reset(operationsPageClosed);

sample({
  clock: multisigOperation.requestOperations.finally,
  source: {
    pendingOperationId: $pendingOperationId,
    operations: multisigOperation.$list,
  },
  filter: ({ pendingOperationId, operations }) => {
    if (nullable(pendingOperationId)) return false;
    const operationExists = operations.some(op => op.id === pendingOperationId);
    return !operationExists;
  },
  target: operationNotFoundModalOpened,
});

function generateMultisigOperationDeepLink(
  operation: MultisigOperationDeepLinkData,
  account: MultisigAccount | FlexibleMultisigAccount,
): string {
  const params = new URLSearchParams({
    chainId: operation.chainId,
    callHash: operation.callHash,
    accountId: account.accountId,
    blockCreated: operation.blockCreated.toString(),
    indexCreated: operation.indexCreated.toString(),
  });

  return `${window.location.origin}/#${Paths.OPERATIONS}?${params.toString()}`;
}

export function getOperationIdFromDeepLink(data: MultisigOperationDeepLinkData): string {
  return `${data.chainId}-${data.callHash}-${data.accountId}-${data.blockCreated}-${data.indexCreated}`;
}

export const deepLinkModel = {
  $focusedOperationId,
  $isDeepLinkLoading,
  setFocusedOperationId,
  operationsPageClosed,

  $isAccountNotFoundModalOpen,
  closeNotFoundModal: closeNotFoundModal,

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
