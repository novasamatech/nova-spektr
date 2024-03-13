import { createEffect, sample } from 'effector';

import { kernelModel } from '@shared/core';
import { XcmConfig, getXcmConfig, fetchXcmConfig, saveXcmConfig } from '@shared/api/xcm';

const getConfigFx = createEffect((): XcmConfig | null => {
  return getXcmConfig();
});

const fetchConfigFx = createEffect((): Promise<XcmConfig> => {
  return fetchXcmConfig();
});

const saveConfigFx = createEffect((config: XcmConfig) => {
  return saveXcmConfig(config);
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
  }
};
