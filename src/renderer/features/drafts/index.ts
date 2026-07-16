import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { CreateDraftModalSlot } from './components/CreateDraftModalSlot';

export { DraftFormBody } from './components/DraftFormBody';
export { DraftModeCard } from './components/DraftModeCard';
export { DraftSigningPath } from './components/DraftSigningPath';
export { DraftsSection } from './components/DraftsSectionLazy';
export { draftAccountsOverviewSlot } from './lib/draft-row-slot';
export { type DraftNetworkStore, createDraftModeBinding } from './lib/createDraftModeBinding';
export { useCanCreateDraft } from './lib/useCanCreateDraft';
export { wireDraftCloseRedirect } from './lib/wireDraftCloseRedirect';
export { wireDraftSourceBalance } from './lib/wireDraftSourceBalance';
export { type DraftSeed, createDraftModel } from './model/create-draft-model';
export { type Draft } from '@/domains/backend';
export { type DraftListScope, filterDraftsByScope } from './lib/draft-scope';
export { draftDeepLinkModel } from './model/draft-deep-link';
export { DraftIcon } from './components/DraftIcon';
export { useVisibleDrafts } from './lib/useVisibleDrafts';
export { useSubmitDraft } from './lib/useSubmitDraft';
export { useDraftOperationTitle } from './lib/useDraftOperationTitle';
export { useDraftTransactionAmount } from './lib/useDraftTransactionAmount';
export { type DraftSubmitGate, getDraftSubmitGate } from './lib/submit-draft-availability';

import './model/contact-proxies-model';

const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModalSlot);

export { draftsFeature };
