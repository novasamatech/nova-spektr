import { createEvent, createStore } from 'effector';
import { z } from 'zod';

import { Paths } from '@/shared/routes';
import { deepLinkService } from '@/domains/app';

const draftDeepLinkSchema = z.object({
  draftId: z.string(),
});

const handler = deepLinkService.createDeepLinkHandler({ schema: draftDeepLinkSchema });

const focusCleared = createEvent();

const $focusedDraftId = createStore<string | null>(null)
  .on(handler.triggered, (_, { draftId }) => draftId)
  .reset(focusCleared);

function generateDraftRelativeLink(draftId: string): string {
  const searchParams = new URLSearchParams({ draftId });

  return `${Paths.OPERATIONS}?${searchParams.toString()}`;
}

function generateDraftDeepLink(draftId: string): string {
  return `${window.location.origin}/#${generateDraftRelativeLink(draftId)}`;
}

export const draftDeepLinkModel = {
  $focusedDraftId,
  focusCleared,
  handler,
  generateDraftDeepLink,
  generateDraftRelativeLink,
};
