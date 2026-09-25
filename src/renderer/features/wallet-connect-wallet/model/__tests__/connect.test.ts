import { type default as Client } from '@walletconnect/sign-client';
import { type SessionTypes } from '@walletconnect/types';
import { allSettled, fork } from 'effector';

import { walletConnect } from '../connect';
import { signClient } from '../signClient';

type PendingApproval = {
  resolve: (session: SessionTypes.Struct) => void;
  reject: (reason: unknown) => void;
};

/**
 * Sign client stub. `connect()` waits for the test to let it through, then
 * publishes its own uri and hands out an `approval()` the test settles by hand.
 * Several session requests can be in flight at the same time, each stopped
 * where the test needs it.
 */
const createClientStub = () => {
  const connects: (() => void)[] = [];
  const approvals: PendingApproval[] = [];

  const client = {
    on: vi.fn(),
    extend: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(() => Promise.resolve()),
    session: { getAll: () => [] },
    pairing: { getAll: () => [] },
    core: { pairing: { updateExpiry: vi.fn(() => Promise.resolve()) } },
    connect: vi.fn(() => {
      const uri = `wc:request-${connects.length + 1}`;

      return new Promise<{ uri: string; approval: () => Promise<SessionTypes.Struct> }>(resolve => {
        connects.push(() =>
          resolve({
            uri,
            approval: () =>
              new Promise<SessionTypes.Struct>((resolveApproval, rejectApproval) => {
                approvals.push({ resolve: resolveApproval, reject: rejectApproval });
              }),
          }),
        );
      });
    }),
  };

  return { client, connects, approvals, asClient: client as unknown as Client };
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('features/wallet-connect-wallet/model/connect', () => {
  test('a settled request only clears the uri it published itself', async () => {
    const { asClient, connects, approvals } = createClientStub();
    const scope = fork();

    const first = allSettled(walletConnect.createSession, { scope, params: { client: asClient, chains: [] } });
    await vi.waitUntil(() => connects.length === 1);
    connects[0]!();
    await vi.waitUntil(() => approvals.length === 1);
    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-1');

    const second = allSettled(walletConnect.createSession, { scope, params: { client: asClient, chains: [] } });
    await vi.waitUntil(() => connects.length === 2);
    connects[1]!();
    await vi.waitUntil(() => approvals.length === 2);
    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-2');

    approvals[0]!.reject(new Error('Proposal expired'));
    await flush();

    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-2');

    approvals[1]!.reject(new Error('Proposal expired'));
    await Promise.all([first, second]);

    expect(scope.getState(walletConnect.$pairingUri)).toBe('');
  });

  test('a new request drops the previous uri before it connects', async () => {
    const { asClient, connects, approvals } = createClientStub();
    const scope = fork();

    const first = allSettled(walletConnect.createSession, { scope, params: { client: asClient, chains: [] } });
    await vi.waitUntil(() => connects.length === 1);
    connects[0]!();
    await vi.waitUntil(() => approvals.length === 1);
    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-1');

    // The proposal behind `wc:request-1` is still valid, so that code would still pair.
    const second = allSettled(walletConnect.createSession, { scope, params: { client: asClient, chains: [] } });
    await vi.waitUntil(() => connects.length === 2);

    expect(scope.getState(walletConnect.$pairingUri)).toBe('');

    connects[1]!();
    await vi.waitUntil(() => approvals.length === 2);

    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-2');

    approvals[0]!.reject(new Error('Proposal expired'));
    approvals[1]!.reject(new Error('Proposal expired'));
    await Promise.all([first, second]);
  });

  test('an expiring session leaves the displayed uri alone', async () => {
    const { client, asClient, connects, approvals } = createClientStub();
    const scope = fork({
      handlers: new Map<any, any>([[signClient.createClient, () => Promise.resolve(asClient)]]),
    });

    await allSettled(signClient.createClient, { scope });

    const request = allSettled(walletConnect.createSession, { scope, params: { client: asClient, chains: [] } });
    await vi.waitUntil(() => connects.length === 1);
    connects[0]!();
    await vi.waitUntil(() => approvals.length === 1);

    const expireSession = client.on.mock.calls.find(([event]) => event === 'session_expire')?.[1];
    expireSession?.();

    expect(scope.getState(walletConnect.$pairingUri)).toBe('wc:request-1');

    approvals[0]!.reject(new Error('Proposal expired'));
    await request;
  });
});
