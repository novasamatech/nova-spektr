import { createFeature } from '@shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

export const referendumsFeatureStatus = createFeature(fellowshipNetworkFeature.model.network.$network);
