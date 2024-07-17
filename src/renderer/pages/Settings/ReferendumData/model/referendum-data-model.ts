import { attach, createApi, createStore, sample } from 'effector';
import { type NavigateFunction } from 'react-router-dom';
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
