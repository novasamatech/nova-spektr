import { type Store, clearNode, createDomain, createEffect, createStore, launch, sample, withRegion } from 'effector';

import { createAbstractIdentifier } from './createAbstractIdentifier';
import { isIdentifier } from './helpers';
import { type Handler, type Identifier } from './types';

export type CombineIdentifier<State, Result> = Identifier<Result, State, Store<State>, Store<State>> & {
  store: Store<Result>;
};

export const isCombineIdentifier = (v: unknown): v is CombineIdentifier<any, any> => {
  return isIdentifier(v) && v.type === 'combine';
};

export const createCombine = <State, const Result>(config: {
  name?: string;
  defaultValue: NoInfer<Result>;
  fn: (state: State[]) => Result;
}): CombineIdentifier<State, Result> => {
  const name = config?.name ?? 'unknownCombine';
  const identifier = createAbstractIdentifier<Result, State, Store<State>, Store<State>>({
    type: 'combine',
    name,
    processHandler: (handler) => ({
      key: handler.key,
      available: handler.available,
      body: handler.body,
    }),
  });

  const $store = createStore<State[]>([], { name: `${name}/store` });
  let domain = createDomain({ name: `${name}/bindingDomain` });

  const bindFx = createEffect((handlers: Handler<Store<State>>[]) => {
    clearNode(domain);
    domain = createDomain({ name: config.name });
    const stores = handlers.filter((h) => h.available()).map((h) => h.body);

    withRegion(domain, () => {
      sample({
        clock: stores,
        fn: (...states) => states as State[],
        target: $store,
      });

      // eslint-disable-next-line effector/no-getState
      const states = stores.map((s) => s.getState());

      launch($store, states);
    });
  });

  sample({
    clock: identifier.$handlers,
    target: bindFx,
  });

  // eslint-disable-next-line effector/no-getState
  bindFx(identifier.$handlers.getState());

  return {
    ...identifier,
    store: $store.map(config.fn),
  };
};
