import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { CreateDraftModal } from './components/CreateDraftModal';

export const draftsFeature = createFeature({
  name: 'drafts/modal',
});

draftsFeature.inject(modalsSlot, CreateDraftModal);
