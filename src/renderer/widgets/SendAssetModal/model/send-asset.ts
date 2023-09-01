import { createStore, createEffect, createEvent, sample, forward } from 'effector';

import { XcmConfig, fetchXcmConfig, getXcmConfig, saveXcmConfig } from '@renderer/shared/api/cross-chain';

export const $finalConfig = createStore<any | null>(null);
const xcmConfigRequested = createEvent();

const getConfigFx = createEffect((): XcmConfig | null => {
  return getXcmConfig();
});
const fetchConfigFx = createEffect((): Promise<XcmConfig> => {
  return fetchXcmConfig();
});
const saveConfigFx = createEffect((config: XcmConfig) => {
  return saveXcmConfig(config);
});

// TODO: continue config calculation in cross-chain service task
const calculateFinalConfigFx = createEffect((config: XcmConfig): XcmConfig => {
  return config;
});

sample({
  clock: xcmConfigRequested,
  target: [getConfigFx, fetchConfigFx],
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
