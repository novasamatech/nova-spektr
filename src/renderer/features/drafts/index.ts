import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { CreateDraftModal } from './components/CreateDraftModal';

export { DraftsSection } from './components/DraftsSection';
export { InitiateDraftButton } from './components/InitiateDraftButton';
export { draftAccountsOverviewSlot } from './components/DraftRow';
export { type DraftSeed, createDraftModel } from './model/create-draft-model';
export { type Draft } from '@/domains/backend';

import './model/contact-proxies-model';

const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModal);

export { draftsFeature };
