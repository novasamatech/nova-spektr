import { createFeature } from '@shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

export const profileFeatureStatus = createFeature(fellowshipNetworkFeature.model.network.$network);
