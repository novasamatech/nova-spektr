import { allSettled, createEvent, createStore, createWatch, fork } from 'effector';
import { isString } from 'lodash';

import { waitFor } from './waitFor';

describe('waitFor', () => {
  it('should pass event', async () => {
    const scope = fork();
    const spy = vi.fn();

    const event = createEvent<string>();
    const clock = createEvent<string>();

    const waitEvent = waitFor({
      source: event,
      clock,
      filter: isString,
    });

    createWatch({
      unit: waitEvent,
      fn: spy,
      scope,
    });

    await allSettled(event, { params: 'test_event', scope });
    await allSettled(clock, { params: 'test_clock', scope });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ event: 'test_event', trigger: 'test_clock' });
  });

  it('should work with store clock', async () => {
    const scope = fork();
    const spy = vi.fn();

    const event = createEvent<string>();
    const clock = createStore<string>('test_1');

    const waitEvent = waitFor({
      source: event,
      clock,
      filter: (s): s is string => s !== 'test_1',
    });

    createWatch({
      unit: waitEvent,
      fn: spy,
      scope,
    });

    await allSettled(event, { params: 'test_event', scope });
    await allSettled(clock, { params: 'test_2', scope });
    await allSettled(event, { params: 'test_event_2', scope });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({ event: 'test_event', trigger: 'test_2' });
    expect(spy).toHaveBeenCalledWith({ event: 'test_event_2', trigger: 'test_2' });
  });
});
