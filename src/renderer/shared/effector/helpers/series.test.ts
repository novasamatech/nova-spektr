import { createEvent, createWatch } from 'effector';

import { series } from './series';

describe('series', () => {
  it('should spread array into events', () => {
    const spy = jest.fn();
    const targetEvent = createEvent<number>();
    const wrappedEvent = series(targetEvent);

    createWatch({
      unit: targetEvent,
      fn: spy,
    });

    wrappedEvent([1, 2, 2, 3, 3, 3]);

    expect(spy).toHaveBeenCalledTimes(6);
    expect(spy.mock.calls).toEqual([[1], [2], [2], [3], [3], [3]]);
  });
});
