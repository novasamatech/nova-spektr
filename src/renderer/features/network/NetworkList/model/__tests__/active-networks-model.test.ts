import { allSettled, fork } from 'effector';

import { networkModel } from '@/entities/network';
import { activeNetworksModel } from '../active-networks-model';

import { networksMock } from './mocks/networks-mock';

describe('features/network/NetworksList/active-networks-model', () => {
  test('should update active networks on networksChanged', async () => {
    const { chains, connections, connectionStatuses } = networksMock;

    const scope = fork({
      values: new Map()
        .set(networkModel.$connections, connections)
        .set(networkModel.$connectionStatuses, connectionStatuses),
    });

    await allSettled(activeNetworksModel.events.networksChanged, { scope, params: chains });

    expect(scope.getState(activeNetworksModel.$activeNetworks)).toHaveLength(3);
  });
});
