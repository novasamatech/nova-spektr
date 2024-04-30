import { fork, allSettled } from 'effector';

import { assetsSearchModel } from '../assets-search-model';

describe('features/assets/AssetsSearch/model/assets-search-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should update $query on change', async () => {
    const scope = fork({
      values: new Map().set(assetsSearchModel.$query, 'hello'),
    });

    await allSettled(assetsSearchModel.events.queryChanged, { scope, params: 'world' });

    expect(scope.getState(assetsSearchModel.$query)).toEqual('world');
  });
});
