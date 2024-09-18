import { createFeature } from '@shared/effector';
import { fellowshipNetworkFeature } from '@/features/fellowship-network';

export const membersFeatureStatus = createFeature(fellowshipNetworkFeature.model.network.$network);
