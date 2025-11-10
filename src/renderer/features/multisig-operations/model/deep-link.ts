import { combine, createEvent, createStore, sample } from 'effector';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { deepLinkService } from '@/domains/app';
import { accounts, multisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelect } from '@/aggregates/wallet-select';

const setFocusedOperationId = createEvent<string | null>();

const $operationId = createStore<string | null>(null).on(setFocusedOperationId, (_, v) => v);

const $focusedOperation = combine({
  operationId: $operationId,
  list: multisigOperation.$list,
}).map(({ operationId, list }) => list.find(item => item.id === operationId));

const $focusedOperationId = createStore<string | null>(null);

const alreadySignedModalOpened = createEvent();
const closeAlreadySignedModal = createEvent();
const viewAlreadySignedOperation = createEvent();
const $isAlreadySignedModalOpen = createStore(false)
  .on(alreadySignedModalOpened, () => true)
  .on(closeAlreadySignedModal, () => false)
  .on(viewAlreadySignedOperation, () => false);

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

const accountNotFoundModalOpened = createEvent();
const closeNotFoundModal = createEvent();
const $isAccountNotFoundModalOpen = createStore(false)
  .on(accountNotFoundModalOpened, () => true)
  .on(closeNotFoundModal, () => false);

// Check if account exists before selecting wallet
const accountChecked = sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  source: accounts.$list,
  fn: (accountsList, data) => {
    const account = accountsList.find(acc => acc.accountId === data.accountId);
    return {
      data,
      account: account ?? null,
    };
  },
});

// If account exists, select wallet and set operation
sample({
  clock: accountChecked,
  filter: ({ account }) => account !== null,
  fn: ({ account }) => account!.walletId,
  target: walletSelect.select,
});

sample({
  clock: accountChecked,
  filter: ({ account }) => nonNullable(account),
  fn: ({ data }) => getOperationIdFromDeepLink(data),
  target: setFocusedOperationId,
});

// If account doesn't exist, show modal
sample({
  clock: accountChecked,
  filter: ({ account }) => account === null,
  target: accountNotFoundModalOpened,
});

// Trigger operations fetch when landing via deep link if operation not found
sample({
  clock: accountChecked,
  source: { apis: networkModel.$apis, chains: networkModel.$chains, operations: multisigOperation.$list },
  filter: ({ operations }, { account, data }) => {
    if (account === null) return false;
    const operationId = getOperationIdFromDeepLink(data);
    const operationExists = operations.some(op => op.id === operationId);
    return !operationExists;
  },
  fn: ({ apis, chains }, { data }) => ({
    apis,
    chains,
    accountId: data.accountId,
  }),
  target: multisigOperation.requestOperations,
});

function generateMultisigOperationDeepLink(data: MultisigOperationDeepLinkData): string {
  const params = new URLSearchParams({
    chainId: data.chainId,
    callHash: data.callHash,
    accountId: data.accountId,
    blockCreated: data.blockCreated.toString(),
    indexCreated: data.indexCreated.toString(),
  });

  return `${window.location.origin}/#${Paths.OPERATIONS}?${params.toString()}`;
}

export function getOperationIdFromDeepLink(data: MultisigOperationDeepLinkData): string {
  return `${data.chainId}-${data.callHash}-${data.accountId}-${data.blockCreated}-${data.indexCreated}`;
}

export const deepLinkModel = {
  $focusedOperationId,
  setFocusedOperationId,

  $isAccountNotFoundModalOpen,
  closeNotFoundModal: closeNotFoundModal,

  $isAlreadySignedModalOpen,
  closeAlreadySignedModal,
  viewAlreadySignedOperation,

  generateMultisigOperationDeepLink,
  multisigOperationDeepLinkHandler,
};
