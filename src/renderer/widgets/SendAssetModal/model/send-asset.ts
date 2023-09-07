import { createStore, createEffect, createEvent, sample, forward, attach } from 'effector';

import { XcmConfig } from '@renderer/shared/api/xcm';
import { xcmModel } from '@renderer/entities/xcm';

export const $finalConfig = createStore<any | null>(null);
const xcmConfigRequested = createEvent();

// TODO: continue config calculation in xcm service task
const calculateFinalConfigFx = createEffect((config: XcmConfig): XcmConfig => {
  return config;
});

const getConfigFx = attach({ effect: xcmModel.effects.getConfigFx });
const saveConfigFx = attach({ effect: xcmModel.effects.saveConfigFx });
const fetchConfigFx = attach({ effect: xcmModel.effects.fetchConfigFx });

forward({
  from: xcmConfigRequested,
  to: [getConfigFx, fetchConfigFx],
});

sample({
  clock: getConfigFx.doneData,
  filter: (config): config is XcmConfig => Boolean(config),
  target: calculateFinalConfigFx,
});

forward({
  from: fetchConfigFx.doneData,
  to: [saveConfigFx, calculateFinalConfigFx],
});

forward({
  from: calculateFinalConfigFx.doneData,
  to: $finalConfig,
});

export const events = {
  xcmConfigRequested,
};
