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

import './model/contact-proxies-model';

const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModalSlot);

export { draftsFeature };
