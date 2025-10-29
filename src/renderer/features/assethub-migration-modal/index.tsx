import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { AssetHubMigrationModal } from './components/AssetHubMigrationModal';

export const assethubMigrationModalFeature = createFeature({
  name: 'assethub/migration-modal',
});

assethubMigrationModalFeature.inject(modalsSlot, AssetHubMigrationModal);
