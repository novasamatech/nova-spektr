import { EventEmitter } from 'node:events';

import { allSettled, createStore, fork, sample } from 'effector';

import { createSubscriber } from '../createSubscriber';

describe('createSubscriber', () => {
  it('should subscribe and unsubscribe', async () => {
    const { subscribe, unsubscribe, $subscribed } = createSubscriber(() => {
      return () => undefined;
    });

    const scope = fork();

    expect(scope.getState($subscribed)).toBe(false);

    await allSettled(subscribe, { scope });
    expect(scope.getState($subscribed)).toBe(true);

    await allSettled(unsubscribe, { scope });
    expect(scope.getState($subscribed)).toBe(false);
  });

  it('should re-subscribe', async () => {
    const scope = fork();
    const emitter = new EventEmitter();

    const pushValue = (v: string) => {
      emitter.emit('event', v);
    };

    const { subscribe, received } = createSubscriber<string, string>((param, cb) => {
      emitter.addListener('event', (data) => {
        cb(`${param}_${data}`);
      });

      return () => {
        emitter.removeAllListeners('event');
      };
    }, scope);

    const $results = createStore<string[]>([]);

    sample({
      clock: received,
      source: $results,
      fn: (list, { result }) => [...list, result],
      target: $results,
    });

    await allSettled(subscribe, { scope, params: '1' });
    pushValue('1');
    expect(scope.getState($results)).toEqual(['1_1']);

    await allSettled(subscribe, { scope, params: '2' });
    pushValue('2');
    expect(scope.getState($results)).toEqual(['1_1', '2_2']);
  });

  it('should receiveValues', async () => {
    const scope = fork();
    const emitter = new EventEmitter();

    const pushValue = (v: string) => {
      emitter.emit('event', v);
    };

    const { subscribe, unsubscribe, received } = createSubscriber<void, string>((_, cb) => {
      emitter.addListener('event', cb);

      return () => {
        emitter.removeAllListeners('event');
      };
    }, scope);

    const $results = createStore<string[]>([]);

    sample({
      clock: received,
      source: $results,
      fn: (list, { result }) => [...list, result],
      target: $results,
    });

    // subscribe events

    await allSettled(subscribe, { scope });

    pushValue('1');
    pushValue('2');

    expect(scope.getState($results)).toEqual(['1', '2']);

    // skip updated after unsubscribe

    await allSettled(unsubscribe, { scope });

    pushValue('3');

    // eslint-disable-next-line effector/no-getState
    expect(scope.getState($results)).toEqual(['1', '2']);
  });
});
