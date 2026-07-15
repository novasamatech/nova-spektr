import { allSettled, createEvent, createStore, createWatch, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ResourceRequestKey } from '@/shared/query';

import { wireSubscriptions } from './wireSubscriptions';

type Params = { id: string };

/** A stand-in for a pooled resource, recording what it is asked to hold. */
const createFakeResource = () => ({
  subscribe: createEvent<Params>(),
  unsubscribe: createEvent<ResourceRequestKey>(),
  createKey: ({ id }: Params) => id as ResourceRequestKey,
});

const setup = () => {
  const resource = createFakeResource();
  const desiredChanged = createEvent<Params[]>();
  const $desired = createStore<Params[]>([]).on(desiredChanged, (_, next) => next);

  wireSubscriptions(resource, $desired);

  const scope = fork();
  const subscribed: string[] = [];
  const unsubscribed: string[] = [];
  createWatch({ unit: resource.subscribe, scope, fn: ({ id }) => subscribed.push(id) });
  createWatch({ unit: resource.unsubscribe, scope, fn: key => unsubscribed.push(key) });

  const want = (ids: string[]) => allSettled(desiredChanged, { scope, params: ids.map(id => ({ id })) });

  return { want, subscribed, unsubscribed };
};

describe('wireSubscriptions', () => {
  it('subscribes to what appears and unsubscribes from what leaves', async () => {
    const { want, subscribed, unsubscribed } = setup();

    await want(['a', 'b']);
    expect(subscribed).toEqual(['a', 'b']);
    expect(unsubscribed).toEqual([]);

    await want(['b', 'c']);
    expect(subscribed).toEqual(['a', 'b', 'c']);
    expect(unsubscribed).toEqual(['a']);
  });

  it('is a no-op when the set is unchanged, however often it republishes', async () => {
    // The desired list is rebuilt from scratch on every chain and wallet update,
    // so it arrives as an equal-but-new array constantly. Re-subscribing on those
    // would inflate the resource's ref count and strand live subscriptions.
    const { want, subscribed, unsubscribed } = setup();

    await want(['a']);
    await want(['a']);
    await want(['a']);

    expect(subscribed).toEqual(['a']);
    expect(unsubscribed).toEqual([]);
  });

  it('drops everything when the desired set empties — the block leaving the screen', async () => {
    const { want, subscribed, unsubscribed } = setup();

    await want(['a', 'b']);
    await want([]);

    expect(subscribed).toEqual(['a', 'b']);
    expect(unsubscribed).toEqual(['a', 'b']);
  });
});
