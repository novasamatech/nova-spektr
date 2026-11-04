import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { createAccountId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { networkModel } from '@/entities/network';

import { identityResource } from './resource';

const { superOfMock, identityOfMock } = vi.hoisted(() => ({ superOfMock: vi.fn(), identityOfMock: vi.fn() }));

vi.mock('@/shared/pallet/identity', () => ({
  identityPallet: {
    supportedOn: () => true,
    storage: { superOf: superOfMock, identityOf: identityOfMock },
  },
}));

type Info = { display: string; email?: string; web?: string; github?: string; matrix?: string };

const identityInfo = ({ display, email = '', web = '', github, matrix }: Info) => ({
  identity: { info: { display, email, image: '', web, github, matrix } },
});

// Each call uses its own accounts: the resource caches responses by account list.
const requestIdentity = async (seed: string, info: string | Info, subName?: string) => {
  const parent = createAccountId(`${seed}-parent`);
  const sub = createAccountId(`${seed}-sub`);
  const account = subName === undefined ? parent : sub;

  superOfMock.mockResolvedValue([{ account, identity: subName === undefined ? null : [parent, subName] }]);
  identityOfMock.mockResolvedValue([
    { account: parent, ...identityInfo(typeof info === 'string' ? { display: info } : info) },
  ]);

  const scope = fork({
    values: [
      [networkModel.$chains, { [polkadotChainId]: polkadotChain }],
      [networkModel.$apis, { [polkadotChainId]: { isReady: Promise.resolve() } }],
    ],
  });

  const result = await allSettled(identityResource.fetch, {
    scope,
    params: { accounts: [account], chainId: polkadotChainId },
  });
  if (result.status === 'fail') throw result.value;

  return result.value[account];
};

describe('identityResource', () => {
  it('removes invisible and control characters from identity and sub-identity names', async () => {
    const identity = await requestIdentity('cleaned', '\u202EAlice\u200B\n', ' treasury\u2066 ');

    expect(identity).toMatchObject({ name: 'Alice', subName: 'treasury' });
  });

  it('removes invisible characters from the other identity text fields', async () => {
    const identity = await requestIdentity('fields', {
      display: 'Alice',
      email: 'alice​@example.com',
      web: '‮https://alice.example',
      github: 'alice⁠-gh',
    });

    expect(identity).toMatchObject({
      email: 'alice@example.com',
      website: 'https://alice.example',
      github: 'alice-gh',
      matrix: undefined,
    });
  });

  it('drops a sub-identity name that has no visible characters', async () => {
    const identity = await requestIdentity('empty-sub', 'Alice', '\u200B\u202E');

    expect(identity?.name).toBe('Alice');
    expect(identity?.subName).toBeUndefined();
  });
});
