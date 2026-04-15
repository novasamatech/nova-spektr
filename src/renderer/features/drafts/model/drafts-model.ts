import { sample } from 'effector';

import { draftsResource } from '@/domains/backend';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

// Auto-fetch drafts on authentication
sample({
  clock: authModel.$authState,
  source: backendConfigurationModel.$backendUrl,
  filter: (url, authState): url is string => url !== null && authState !== null,
  fn: (baseUrl: string) => ({ baseUrl }),
  target: draftsResource.start,
});

// Clear on disconnect
sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: draftsResource.resetDrafts,
});
