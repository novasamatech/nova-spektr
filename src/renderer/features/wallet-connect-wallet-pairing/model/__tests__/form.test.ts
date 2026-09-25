import { type SessionTypes } from '@walletconnect/types';
import { allSettled, fork } from 'effector';

import { identity } from '@/domains/network';
import { walletConnect } from '@/features/wallet-connect-wallet';
import { Step } from '../../lib/constants';
import { pairingFormModel } from '../form';

type PendingApproval = {
  resolve: (session: SessionTypes.Struct) => void;
  reject: (reason: unknown) => void;
};

const makeSession = (topic: string) =>
  ({
    topic,
    pairingTopic: `pairing-${topic}`,
    acknowledged: true,
    namespaces: { polkadot: { accounts: [], chains: [], methods: [], events: [] } },
  }) as unknown as SessionTypes.Struct;

/**
 * Sign client stub. Every `connect()` publishes its own uri and hands out an
 * `approval()` the test settles by hand, so several pairing attempts can be in
 * flight at the same time.
 */
const createClientStub = () => {
  const approvals: PendingApproval[] = [];
  const sessions: SessionTypes.Struct[] = [];

  const client = {
    on: vi.fn(),
    extend: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(() => Promise.resolve()),
    session: { getAll: () => sessions },
    pairing: { getAll: () => [] },
    core: { pairing: { updateExpiry: vi.fn(() => Promise.resolve()) } },
    connect: vi.fn(() =>
      Promise.resolve({
        uri: `wc:attempt-${approvals.length + 1}`,
        approval: () =>
          new Promise<SessionTypes.Struct>((resolve, reject) => {
            approvals.push({ resolve, reject });
          }),
      }),
    ),
  };

  return { client, approvals, sessions };
};

const makeScope = (client: object) =>
  fork({
    values: new Map().set(walletConnect.__test.$client, client),
    handlers: new Map<any, any>([[identity.request, vi.fn().mockResolvedValue({})]]),
  });

const openPairing = () => ({ type: 'novawallet' as const, onComplete: vi.fn() });

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('features/wallet-connect-wallet-pairing/model/form', () => {
  test('rejects the pairing when the attempt on screen fails', async () => {
    const { client, approvals } = createClientStub();
    const scope = makeScope(client);

    const pairing = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 1);

    approvals[0]!.reject(new Error('Proposal expired'));
    await pairing;

    expect(scope.getState(pairingFormModel.$step)).toBe(Step.REJECT);
    expect(scope.getState(pairingFormModel.$error)).toEqual({ title: 'Proposal expired' });
  });

  test('ignores a failure that arrives after the modal was closed', async () => {
    const { client, approvals } = createClientStub();
    const scope = makeScope(client);

    const pairing = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 1);

    const shut = allSettled(pairingFormModel.flow.shut, { scope });
    approvals[0]!.reject(new Error('Proposal expired'));
    await Promise.all([pairing, shut]);

    expect(scope.getState(pairingFormModel.$step)).toBe(Step.SCAN);
    expect(scope.getState(pairingFormModel.$error)).toBeNull();
  });

  test('leaves a restarted pairing alone when the abandoned attempt fails', async () => {
    const { client, approvals } = createClientStub();
    const scope = makeScope(client);

    const first = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 1);

    const shut = allSettled(pairingFormModel.flow.shut, { scope });
    const second = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 2);

    approvals[0]!.reject(new Error('Proposal expired'));
    await flush();

    expect(scope.getState(pairingFormModel.$step)).toBe(Step.SCAN);
    expect(scope.getState(pairingFormModel.$error)).toBeNull();
    expect(scope.getState(pairingFormModel.$uri)).toBe('wc:attempt-2');

    approvals[1]!.reject(new Error('Proposal expired'));
    await Promise.all([first, shut, second]);
  });

  test('disconnects a session that arrives for an abandoned attempt', async () => {
    const { client, approvals, sessions } = createClientStub();
    const scope = makeScope(client);

    const first = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 1);

    const shut = allSettled(pairingFormModel.flow.shut, { scope });
    const second = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 2);

    const abandoned = makeSession('abandoned');
    sessions.push(abandoned);
    approvals[0]!.resolve(abandoned);
    await flush();

    expect(client.disconnect).toHaveBeenCalledWith(expect.objectContaining({ topic: 'abandoned' }));
    expect(scope.getState(pairingFormModel.$session)).toBeNull();
    expect(scope.getState(pairingFormModel.$step)).toBe(Step.SCAN);

    approvals[1]!.reject(new Error('Proposal expired'));
    await Promise.all([first, shut, second]);
  });

  test('keeps the session of the attempt on screen', async () => {
    const { client, approvals, sessions } = createClientStub();
    const scope = makeScope(client);

    const pairing = allSettled(pairingFormModel.flow.open, { scope, params: openPairing() });
    await vi.waitUntil(() => approvals.length === 1);

    const paired = makeSession('paired');
    sessions.push(paired);
    approvals[0]!.resolve(paired);
    await pairing;

    expect(scope.getState(pairingFormModel.$session)).toEqual(paired);
    expect(scope.getState(pairingFormModel.$step)).toBe(Step.MANAGE);
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});
