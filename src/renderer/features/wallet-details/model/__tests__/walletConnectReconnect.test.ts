import { SDK_ERRORS } from '@walletconnect/utils';
import { allSettled, fork } from 'effector';

import { walletConnect } from '@/features/wallet-connect-wallet';
import { ReconnectStep } from '../../lib/constants';
import { walletConnectReconnect } from '../walletConnectReconnect';

type PendingRequest = { reject: (reason: unknown) => void };

/** A direct rejection: `refreshSession` reports it instead of retrying. */
const userRejected = () => ({ code: SDK_ERRORS.USER_REJECTED.code, message: 'User rejected' });

const clientStub = { session: { getAll: () => [] } };

const makeScope = (requests: PendingRequest[]) =>
  fork({
    values: new Map().set(walletConnect.__test.$client, clientStub),
    handlers: new Map<any, any>([
      [
        walletConnect.createSession,
        () =>
          new Promise((_resolve, reject) => {
            requests.push({ reject });
          }),
      ],
    ]),
  });

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('features/wallet-details/model/walletConnectReconnect', () => {
  test('reports the failure of the reconnect the user is waiting for', async () => {
    const requests: PendingRequest[] = [];
    const scope = makeScope(requests);

    const reconnect = allSettled(walletConnectReconnect.start, { scope });
    await vi.waitUntil(() => requests.length === 1);

    requests[0]!.reject(userRejected());
    await reconnect;

    expect(scope.getState(walletConnectReconnect.$reconnectStep)).toBe(ReconnectStep.REJECTED);
    expect(scope.getState(walletConnectReconnect.$error)).not.toBeNull();
  });

  test('ignores the failure of a reconnect the user has superseded', async () => {
    const requests: PendingRequest[] = [];
    const scope = makeScope(requests);

    const first = allSettled(walletConnectReconnect.start, { scope });
    await vi.waitUntil(() => requests.length === 1);

    const second = allSettled(walletConnectReconnect.start, { scope });
    await vi.waitUntil(() => requests.length === 2);

    requests[0]!.reject(userRejected());
    await flush();

    expect(scope.getState(walletConnectReconnect.$reconnectStep)).toBe(ReconnectStep.RECONNECTING);
    expect(scope.getState(walletConnectReconnect.$error)).toBeNull();

    requests[1]!.reject(userRejected());
    await Promise.all([first, second]);
  });
});
