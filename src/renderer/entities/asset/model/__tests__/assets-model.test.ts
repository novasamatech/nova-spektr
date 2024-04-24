import { fork, allSettled } from 'effector';

import { assetsModel } from '../assets-model';

describe('pages/Assets/Assets/model/assets-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should update $query on change', async () => {
    const scope = fork({
      values: new Map().set(assetsModel.$query, 'hello'),
    });

    await allSettled(assetsModel.events.queryChanged, { scope, params: 'world' });

    expect(scope.getState(assetsModel.$query)).toEqual('world');
  });
});
