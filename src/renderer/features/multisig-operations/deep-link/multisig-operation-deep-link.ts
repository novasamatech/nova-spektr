import { createEvent, createStore, sample } from 'effector';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { createDeepLinkHandler } from '@/shared/lib/deep-link';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { accounts } from '@/domains/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { deepLinkModel } from '../model/deep-link';

export const multisigOperationSchema = z.object({
  chainId: z.string().transform(x => x as ChainId),
  callHash: z.string(),
  accountId: z.string().transform(pjsSchema.helpers.toAccountId),
  blockCreated: z.string().transform(Number),
  indexCreated: z.string().transform(Number),
});

export type MultisigOperationDeepLinkData = z.infer<typeof multisigOperationSchema>;

export const multisigOperationDeepLinkHandler = createDeepLinkHandler({
  route: Paths.OPERATIONS,
  schema: multisigOperationSchema,
});

const accountNotFoundModalOpened = createEvent();
const accountNotFoundModalClosed = createEvent();
const $isAccountNotFoundModalOpen = createStore(false)
  .on(accountNotFoundModalOpened, () => true)
  .on(accountNotFoundModalClosed, () => false);

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
  filter: ({ account }) => account !== null,
  fn: ({ data }) => getOperationIdFromDeepLink(data),
  target: deepLinkModel.setFocusedOperationId,
});

// If account doesn't exist, show modal
sample({
  clock: accountChecked,
  filter: ({ account }) => account === null,
  target: accountNotFoundModalOpened,
});

export const accountNotFoundModal = {
  $isOpen: $isAccountNotFoundModalOpen,
  close: accountNotFoundModalClosed,
};

export function generateMultisigOperationDeepLink(data: MultisigOperationDeepLinkData): string {
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
