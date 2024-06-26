import { createStore, createApi, sample, attach } from 'effector';
import { NavigateFunction } from 'react-router-dom';
import { delay } from 'patronum';

import { Paths } from '@shared/routes';
import { offChainModel } from '@features/governance';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

const $navigation = createStore<{ navigate: NavigateFunction } | null>(null);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate }) => ({ ...state, navigate }),
});

sample({
  clock: delay(offChainModel.output.flowClosed, DEFAULT_TRANSITION),
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(Paths.SETTINGS),
  }),
});

export const referendumDataModel = {
  events: {
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
};
