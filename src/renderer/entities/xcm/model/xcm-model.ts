import { createEffect, forward } from 'effector';

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

forward({
  from: kernelModel.events.appStarted,
  to: fetchConfigFx,
});

forward({
  from: fetchConfigFx.doneData,
  to: saveConfigFx,
});

export const effects = {
  getConfigFx,
  fetchConfigFx,
  saveConfigFx,
};
