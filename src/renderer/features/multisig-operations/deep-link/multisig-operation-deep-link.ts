import { sample } from 'effector';
import { z } from 'zod';

import { type ChainId } from '@/shared/core';
import { createDeepLinkHandler } from '@/shared/lib/deep-link';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
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

export const multisigOperationDeepLinkHandler = createDeepLinkHandler<MultisigOperationDeepLinkData>({
  route: Paths.OPERATIONS,
  schema: multisigOperationSchema,
});

sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  fn: (data: MultisigOperationDeepLinkData) => data.accountId,
  target: walletSelect.selectByAccount,
});

sample({
  clock: multisigOperationDeepLinkHandler.triggered,
  fn: (data: MultisigOperationDeepLinkData) => getOperationIdFromDeepLink(data),
  target: deepLinkModel.setFocusedOperationId,
});

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
