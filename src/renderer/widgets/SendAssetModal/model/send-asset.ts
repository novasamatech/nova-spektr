import { createStore, createEffect, createEvent, sample, forward } from 'effector';

import { XcmConfig, useCrossChain } from '@renderer/shared/api/cross-chain';

const { fetchXcmConfig, getXcmConfig, saveXcmConfig } = useCrossChain();

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

const calculateFinalConfig = createEffect((config: XcmConfig) => {
  return 'success';
});

sample({
  clock: xcmConfigRequested,
  target: [getConfigFx, fetchConfigFx],
});

// sample({
//   clock: getConfigFx.doneData,
//   filter: (config) => Boolean(config),
//   target: calculateFinalConfig,
// });

forward({
  from: fetchConfigFx.doneData,
  to: [saveConfigFx, calculateFinalConfig, $finalConfig],
});

export const events = {
  xcmConfigRequested,
};
