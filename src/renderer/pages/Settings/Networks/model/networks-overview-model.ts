import { sample } from 'effector';

import { networksFilterModel, activeNetworksModel, inactiveNetworksModel } from '@features/network';

sample({
  clock: networksFilterModel.$filteredNetworks,
  target: [activeNetworksModel.events.networksChanged, inactiveNetworksModel.events.networksChanged],
});
