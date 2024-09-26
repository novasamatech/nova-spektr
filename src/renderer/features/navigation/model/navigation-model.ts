import { createEffect, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { type NavigateFunction } from 'react-router-dom';

import { type PathType } from '@/shared/routes';

const navigateTo = createEvent<PathType>();

const flow = createGate<{ navigate: NavigateFunction | null }>({ defaultState: { navigate: null } });

type NavigateParams = {
  path: PathType;
  navigate: NavigateFunction;
};

const navigateFx = createEffect(({ path, navigate }: NavigateParams) => {
  navigate(path, { replace: true });
});

sample({
  clock: navigateTo,
  source: { navigate: flow.state.map(({ navigate }) => navigate) },
  filter: ({ navigate }) => !!navigate,
  fn: ({ navigate }, path) => ({
    path,
    navigate: navigate!,
  }),
  target: navigateFx,
});

export const navigationModel = {
  events: {
    navigateTo,
  },

  gates: {
    flow,
  },
};
