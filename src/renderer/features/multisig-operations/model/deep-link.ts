import { combine, createEvent, createStore, sample } from 'effector';
import { z } from 'zod';

import { type ChainId, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { deepLinkService } from '@/domains/app';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';

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
}).map(({ operationId, list }) => list.find(item => item.id === operationId));

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

sample({
  clock: $operationId,
  source: $focusedOperation,
  filter: operation => nonNullable(operation) && operation.status === 'executed',
  target: alreadySignedModalOpened,
});

sample({
  clock: $operationId,
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

const networkChecked = sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  source: networkModel.$chains,
  fn: (chains, data) => {
    const network = chains[data.chainId];
    return {
      data,
      network,
    };
  },
});

sample({
  clock: networkChecked,
  filter: ({ network }) => nullable(network),
  target: networkNotAvailableModalOpened,
});

const accountChecked = sample({
  clock: networkChecked,
  source: { accountsList: accounts.$list, populated: accounts.$populated },
  filter: ({ populated }, { network }) => nonNullable(network) && populated,
  fn: ({ accountsList }, { data }) => {
    const account = accountsList
      .filter(accountUtils.isAnyMultisigAccount)
      .find(acc => acc.accountId === data.accountId);
    const multisigAccountId = account ? multisigService.getMultisigAccountId(account) : null;
    return {
      data,
      account: account ?? null,
      multisigAccountId,
    };
  },
});

sample({
  clock: accountChecked,
  filter: ({ account }) => account !== null,
  fn: ({ account }) => account!.walletId,
  target: walletSelect.select,
});

sample({
  clock: accountChecked,
  filter: ({ multisigAccountId }) => nonNullable(multisigAccountId),
  fn: ({ data, multisigAccountId }) => getOperationIdFromDeepLink({ ...data, accountId: multisigAccountId! }),
  target: setFocusedOperationId,
});

sample({
  clock: accountChecked,
  filter: ({ account }) => account === null,
  target: accountNotFoundModalOpened,
});

const operationFetchRequested = sample({
  clock: accountChecked,
  source: { apis: networkModel.$apis, chains: networkModel.$chains, operations: multisigOperation.$list },
  filter: ({ operations }, { multisigAccountId, data }) => {
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
  source: { pendingOperationId: $pendingOperationId, operations: multisigOperation.$list },
  filter: ({ pendingOperationId, operations }) => {
    if (!nonNullable(pendingOperationId)) return false;
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
  setFocusedOperationId,
  operationsPageClosed,

  $isAccountNotFoundModalOpen,
  closeNotFoundModal: closeNotFoundModal,

  $isNetworkNotAvailableModalOpen,
  closeNetworkNotAvailableModal,

  $isOperationNotFoundModalOpen,
  closeOperationNotFoundModal,

  $isAlreadySignedModalOpen,
  closeAlreadySignedModal,
  viewAlreadySignedOperation,

  generateMultisigOperationDeepLink,
  multisigOperationDeepLinkHandler,
};
