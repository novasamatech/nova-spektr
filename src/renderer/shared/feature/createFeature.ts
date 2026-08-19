import { type Scope, combine, createDomain, createStore, sample } from 'effector';
import { createGate, useGate } from 'effector-react';
import { previous, readonly } from 'patronum';

import { type AnyIdentifier, type InferHandlerBody, isSlotIdentifier, normalizeSlotHandler } from '@/shared/di';
import { shallowEqual } from '@/shared/lib/utils';

import { type RunningState, type StatusParams, createStatus } from './createStatus';

// TODO implement some registration logic (auto-start if it's necessary).
// TODO implement features dependency graph (and somehow merge it with input store, i like that idea).

type Reasons = 'manual' | 'gate';

type Params<T> = Partial<StatusParams<T, Reasons>> & {
  name: `${Uncapitalize<string>}/${Uncapitalize<string>}`;
  scope?: Scope;
};

export type Feature<T> = ReturnType<typeof createFeature<T>>;

export const isFeature = (x: unknown): x is Feature<unknown> => {
  return typeof x === 'object' && x !== null && (x as Feature<unknown>).__BRAND === 'Feature';
};

export const createFeature = <T = object>({
  name,
  filter,
  // @ts-expect-error dynamic value
  input = createStore({}),
  enable = createStore(true),
  scope,
}: Params<T>) => {
  const domain = createDomain(name);

  const {
    $state,
    restore,
    fail,
    start: enableFlag,
    stop: disableFlag,
  } = createStatus({
    name,
    reasons: ['manual', 'gate'],
    input,
    enable,
    filter,
  });

  const $previousState = previous($state);

  const start = enableFlag.prepend(() => 'manual');
  const stop = disableFlag.prepend(() => 'manual');

  const startFromGate = enableFlag.prepend(() => 'gate');
  const stopFromGate = disableFlag.prepend(() => 'gate');

  const $status = $state.map(x => x.status);

  const running = domain.createEvent<T>('running');
  const failed = $status.updates.filter({ fn: x => x === 'failed' });
  const stopped = $status.updates.filter({ fn: x => x === 'idle' || x === 'failed' });

  const isRunning = $status.map(x => x === 'running');
  const isStarting = $status.map(x => x === 'starting');
  const isFailed = $status.map(x => x === 'failed');

  const $input = combine(input, $status, (input, status) => {
    if (status === 'idle') return null;

    return input;
  });

  sample({
    clock: $state,
    source: $previousState,
    filter: (previousState, state) => {
      if (state.status === 'running') {
        if (!previousState) return true;
        if (previousState.status === 'running') {
          return !shallowEqual(previousState.data, state.data);
        }
        return true;
      }

      return false;
    },
    fn: (_, state) => (state as RunningState<T>).data,
    target: running,
  });

  // Gate management

  const gate = createGate(name ? `${name}/gate` : undefined);
  const $gatesOpened = domain.createStore(0, { name: 'gatesOpened' });

  $gatesOpened.on(gate.open, x => x + 1);
  $gatesOpened.on(gate.close, x => x - 1);

  sample({
    clock: $gatesOpened,
    filter: x => x === 1,
    target: startFromGate,
  });

  sample({
    clock: $gatesOpened,
    filter: x => x === 0,
    target: stopFromGate,
  });

  // DI integration

  const registerIdentifier = domain.createEvent<AnyIdentifier>();
  const $identifiers = domain.createStore<AnyIdentifier[]>([]);

  const triggerIdentifiersFx = domain.createEffect((identifiers: AnyIdentifier[]) => {
    for (const identifier of identifiers) {
      identifier.updateHandlers();
    }
  });

  sample({
    clock: registerIdentifier,
    source: $identifiers,
    fn: (list, item) => list.concat(item),
    target: $identifiers,
  });

  sample({
    clock: $status,
    source: $identifiers,
    target: triggerIdentifiersFx,
  });

  const startIfNecessary = domain.createEvent('start if necessary');

  sample({
    clock: startIfNecessary,
    source: $identifiers,
    filter: identifiers => identifiers.length === 0 || (identifiers.length > 0 && !identifiers.every(isSlotIdentifier)),
    target: start,
  });

  const inject = <T extends AnyIdentifier>(identifier: T, body: InferHandlerBody<T>) => {
    registerIdentifier(identifier);

    // special wrapper for views - we trying to start feature on render
    if (isSlotIdentifier(identifier)) {
      const slotHandlerBody = normalizeSlotHandler(body as InferHandlerBody<typeof identifier>);
      const handler = {
        ...slotHandlerBody,
        render: (props: never) => {
          useGate(gate);

          return slotHandlerBody.render(props);
        },
      };

      identifier.registerHandler({
        key: `feature: ${name}`,
        // TODO create correct feature toggle using effector tools
        // eslint-disable-next-line effector/no-getState
        available: () => (scope ? scope.getState(enable) : enable.getState()),
        body: handler,
      });
    } else {
      identifier.registerHandler({
        key: `feature: ${name}`,
        available: () => {
          // TODO create correct feature toggle using effector tools
          // eslint-disable-next-line effector/no-getState
          const isFeatureEnabled = scope ? scope.getState(enable) : enable.getState();
          // eslint-disable-next-line effector/no-getState
          const isFeatureRunning = scope ? scope.getState(isRunning) : isRunning.getState();

          return isFeatureEnabled && isFeatureRunning;
        },
        body,
      });
    }
  };

  // Combine

  return {
    __BRAND: 'Feature',

    name,

    status: readonly($status),
    state: readonly($state),
    input: readonly($input),

    running: readonly(running),
    stopped: readonly(stopped),
    failed: readonly(failed),

    isRunning: readonly(isRunning),
    isStarting: readonly(isStarting),
    isFailed: readonly(isFailed),

    gate,

    start,
    stop,
    fail,
    restore,

    inject,

    startIfNecessary,
  };
};
