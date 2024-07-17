import { allSettled, fork } from 'effector';

import { networkModel } from '@entities/network';
import { networksMock } from './mocks/networks-mock';
import { inactiveNetworksModel } from '../inactive-networks-model';

describe('features/network/NetworksList/inactive-networks-model', () => {
  test('should update inactive networks on networksChanged', async () => {
    const { chains, connections, connectionStatuses } = networksMock;

    const scope = fork({
      values: new Map()
        .set(networkModel.$connections, connections)
        .set(networkModel.$connectionStatuses, connectionStatuses),
    });

    await allSettled(inactiveNetworksModel.events.networksChanged, { scope, params: chains });

    expect(scope.getState(inactiveNetworksModel.$inactiveNetworks)).toHaveLength(1);
  });
});
