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

  it('should receiveValues', async () => {
    type Value = string;
    const emitter = new EventEmitter();

    const pushValue = (v: Value) => {
      emitter.emit('event', v);
    };

    const scope = fork();

    const { subscribe, unsubscribe, received } = createSubscriber<void, string>((_, cb) => {
      emitter.addListener('event', (data) => {
        cb(data as Value);
      });

      return () => {
        emitter.removeAllListeners('event');
      };
    }, scope);

    const $results = createStore<Value[]>([]);

    sample({
      clock: received,
      source: $results,
      fn: (list, value) => [...list, value],
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
