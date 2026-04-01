import { sample } from 'effector';

import { operationDescriptionsResource } from '@/domains/backend';

import { backendConfigurationModel } from './model/backend-configuration-model';

sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: operationDescriptionsResource.resetDescriptions,
});
