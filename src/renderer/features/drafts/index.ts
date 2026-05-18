import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { CreateDraftModal } from './components/CreateDraftModal';

export { AddressBookHealthOverlay } from './components/AddressBookHealthOverlay';
export { DraftModeCard } from './components/DraftModeCard';
export { DraftSigningPath } from './components/DraftSigningPath';
export { DraftsSection } from './components/DraftsSection';
export { ReconnectAddressBookButton } from './components/ReconnectAddressBookButton';
export { draftAccountsOverviewSlot } from './components/DraftRow';
export { createDraftModeBinding } from './lib/createDraftModeBinding';
export { useCanCreateDraft } from './lib/useCanCreateDraft';
export { wireDraftCloseRedirect } from './lib/wireDraftCloseRedirect';
export { wireDraftSourceBalance } from './lib/wireDraftSourceBalance';
export { type DraftSeed, createDraftModel } from './model/create-draft-model';
export { type Draft } from '@/domains/backend';

import './model/contact-proxies-model';

const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModal);

export { draftsFeature };
