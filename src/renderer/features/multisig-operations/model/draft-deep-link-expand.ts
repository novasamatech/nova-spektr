import { sample } from 'effector';

import { draftDeepLinkModel } from '@/features/drafts';
import { type StatusFilterValue } from '../lib/operations-sections';

import { operationsContextModel } from './context';

// A draft deep link must land on a visible row, so it expands a collapsed Drafts group — the
// counterpart of the operation deep-link sample in `context.ts`.
//
// Wired here, not in `context.ts`: the `@/features/drafts` barrel eagerly re-enters this feature's
// barrel (`useDraftOperationTitle` → `operationTitleTransformer`), so importing it from `context.ts`
// reads `operationsContextModel` before it exists. This module is a side-effect import at the end
// of `index.ts`, after every export it depends on; the drafts barrel in turn exports its deep-link
// model before any export that reaches this feature, so the event is initialised whichever barrel
// loads first.
sample({
  clock: draftDeepLinkModel.handler.triggered,
  fn: (): StatusFilterValue => 'drafts',
  target: operationsContextModel.expandSection,
});
