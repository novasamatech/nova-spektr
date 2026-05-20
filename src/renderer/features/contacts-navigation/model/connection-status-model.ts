import { $features } from '@/shared/config/features';
import { connectionHistoryModel } from '@/aggregates/backend';

const $featureEnabled = $features.map((f) => f.addressBookStatus);

export const connectionStatusModel = {
  $hasEverConnected: connectionHistoryModel.$hasEverConnected,
  $featureEnabled,
};
