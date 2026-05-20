import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { CreateDraftModalSlot } from './components/CreateDraftModalSlot';

export { AddressBookHealthOverlay } from './components/AddressBookHealthOverlay';
export { DraftFormBody } from './components/DraftFormBody';
export { DraftModeCard } from './components/DraftModeCard';
export { DraftSigningPath } from './components/DraftSigningPath';
export { DraftsSection } from './components/DraftsSectionLazy';
export { ReconnectAddressBookButton } from './components/ReconnectAddressBookButton';
export { draftAccountsOverviewSlot } from './lib/draft-row-slot';
export { type DraftNetworkStore, createDraftModeBinding } from './lib/createDraftModeBinding';
export { useCanCreateDraft } from './lib/useCanCreateDraft';
export { wireDraftCloseRedirect } from './lib/wireDraftCloseRedirect';
export { wireDraftSourceBalance } from './lib/wireDraftSourceBalance';
export { type DraftSeed, createDraftModel } from './model/create-draft-model';
export { type Draft } from '@/domains/backend';
export { filterVisibleDrafts } from './lib/visible-drafts';
export { draftDeepLinkModel } from './model/draft-deep-link';
export { DraftIcon } from './components/DraftIcon';
export { useReadableDrafts } from './lib/useReadableDrafts';
export { useSubmitDraft } from './lib/useSubmitDraft';
export { getDraftSubmitGate } from './lib/submit-draft-availability';

import './model/contact-proxies-model';

const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModalSlot);

export { draftsFeature };
