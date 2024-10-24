import { createEffect, sample } from 'effector';

import { type XcmConfig, xcmService } from '@/shared/api/xcm';
import { kernelModel } from '@/shared/core';

const getConfigFx = createEffect((): XcmConfig | null => {
  return xcmService.getXcmConfig();
});

const fetchConfigFx = createEffect((): Promise<XcmConfig> => {
  return xcmService.fetchXcmConfig();
});

const saveConfigFx = createEffect((config: XcmConfig) => {
  return xcmService.saveXcmConfig(config);
});

sample({
  clock: kernelModel.events.appStarted,
  target: fetchConfigFx,
});

sample({
  clock: fetchConfigFx.doneData,
  target: saveConfigFx,
});

export const xcmModel = {
  effects: {
    getConfigFx,
    fetchConfigFx,
    saveConfigFx,
  },
};
