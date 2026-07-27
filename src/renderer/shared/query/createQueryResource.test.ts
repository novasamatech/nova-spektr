import { allSettled, createStore, fork } from 'effector';

import { createQueryResource } from './createQueryResource';

type Params = { id: string };

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

const createResource = (fn: (params: Params) => Promise<string>) => {
  return createQueryResource<Params>({ key: ({ id }) => [id] })
    .request<string>((params) => fn(params))
    .cache({
      store: createStore<Record<string, string>>({}),
      map: (cache, result, { id }) => ({ ...cache, [id]: result }),
    })
    .build();
};

describe('shared/query/createQueryResource', () => {
  it('should raise the pending flag of a key while its request is in flight', async () => {
    const deferred = createDeferred<string>();
    const resource = createResource(() => deferred.promise);
    const scope = fork();

    const started = allSettled(resource.start, { scope, params: { id: 'a' } });

    expect(scope.getState(resource.$pending)).toEqual({ [resource.createKey({ id: 'a' })]: true });

    deferred.resolve('done');
    await started;

    expect(scope.getState(resource.$pending)).toEqual({});
    expect(scope.getState(resource.$cache)).toEqual({ a: 'done' });
  });

  it('should track pending per key', async () => {
    const deferredA = createDeferred<string>();
    const deferredB = createDeferred<string>();

    const resource = createResource(({ id }) => (id === 'a' ? deferredA.promise : deferredB.promise));
    const scope = fork();

    // `allSettled` resolves only once the whole scope is idle, so both promises
    // are awaited together at the end and the intermediate state is observed by
    // flushing the microtask queue instead.
    const startedA = allSettled(resource.start, { scope, params: { id: 'a' } });
    const startedB = allSettled(resource.start, { scope, params: { id: 'b' } });

    const keyA = resource.createKey({ id: 'a' });
    const keyB = resource.createKey({ id: 'b' });

    expect(scope.getState(resource.$pending)).toEqual({ [keyA]: true, [keyB]: true });

    deferredA.resolve('a-done');
    await flushMicrotasks();

    // Settling one key must not clear the other.
    expect(scope.getState(resource.$pending)).toEqual({ [keyB]: true });

    deferredB.resolve('b-done');
    await Promise.all([startedA, startedB]);

    expect(scope.getState(resource.$pending)).toEqual({});
    expect(scope.getState(resource.$cache)).toEqual({ a: 'a-done', b: 'b-done' });
  });

  it('should clear the pending flag when the request fails', async () => {
    const deferred = createDeferred<string>();
    const resource = createResource(() => deferred.promise);
    const scope = fork();

    const started = allSettled(resource.start, { scope, params: { id: 'a' } });

    expect(scope.getState(resource.$pending)).toEqual({ [resource.createKey({ id: 'a' })]: true });

    deferred.reject(new Error('boom'));
    await started;

    expect(scope.getState(resource.$pending)).toEqual({});
    expect(scope.getState(resource.$cache)).toEqual({});
  });
});
