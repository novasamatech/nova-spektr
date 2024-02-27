import { fork } from 'effector';

import { networkListModel } from '@features/networks';
import { networkModel } from '@entities/network';
import { mockChains, mockConnectionStatuses, mockConnections } from './mocks/network-list-mock';

const getScopeByQuery = (query: string) => {
  return fork({
    values: new Map()
      .set(networkModel.$chains, mockChains)
      .set(networkModel.$connectionStatuses, mockConnectionStatuses)
      .set(networkModel.$connections, mockConnections)
      .set(networkListModel.$filterQuery, query),
  });
};

describe('features/network/model/netowrk-list-model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should calculate active and inactive chains', async () => {
    const scope = getScopeByQuery('');

    // a chain with the status ERROR is considered as active
    expect(scope.getState(networkListModel.$activeChainsSorted)).toHaveLength(3);
    expect(scope.getState(networkListModel.$inactiveChainsSorted)).toHaveLength(1);
  });

  test('should filter sorted chains depending on the query', async () => {
    const scope = getScopeByQuery('Test chain 1');

    expect(scope.getState(networkListModel.$activeChainsSorted)).toHaveLength(1);
    expect(scope.getState(networkListModel.$inactiveChainsSorted)).toHaveLength(0);
  });
});
