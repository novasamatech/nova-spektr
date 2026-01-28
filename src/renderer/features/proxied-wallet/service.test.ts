import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';

import { type ProxiedAccount, type ProxyType, AccountType, CryptoType, ProxyVariant, SigningType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { createAccountId, createWcAccount } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyTransaction } from '@/domains/network';

import { proxiedService } from './service';

type PermissionTestCase = {
  route: ProxyType[];
  transaction: AnyTransaction;
  expected: boolean;
};

describe('proxy service', () => {
  it.each<PermissionTestCase>([
    // positive - narrowing
    { route: ['Any', 'Staking'], transaction: createStakingTransaction(), expected: true },
    { route: ['NonTransfer', 'Governance'], transaction: createVotingTransaction(), expected: true },
    { route: ['Any', 'NonTransfer', 'Governance'], transaction: createVotingTransaction(), expected: true },
    { route: ['NonTransfer', 'Any', 'Governance'], transaction: createVotingTransaction(), expected: true },

    // positive - same proxy types in route
    { route: ['Any', 'Staking', 'Staking'], transaction: createStakingTransaction(), expected: true },
    { route: ['Staking', 'Staking'], transaction: createStakingTransaction(), expected: true },

    // negative - non transfer
    { route: ['NonTransfer'], transaction: createTransferTransaction(), expected: false },

    // negative - not overlapping proxy types
    { route: ['Staking', 'Governance'], transaction: createStakingTransaction(), expected: false },
    { route: ['Staking', 'Governance'], transaction: createVotingTransaction(), expected: false },
  ])('should correctly calculate route permission', async ({ route, transaction, expected }) => {
    const api = await createApi();

    const proxiedAccounts = route.map((proxyType, index) =>
      createProxiedAccount(proxyType, createAccountId(index), createAccountId(index + 1)),
    );
    const accounts = [...proxiedAccounts, createWcAccount(route.length)];

    const result = proxiedService.checkPermission(api, accounts, transaction);

    // empty result means ok.
    expect(nullable(result)).toBe(expected);
  });
});

const createProxiedAccount = (
  proxyType: ProxyType,
  accountId: AccountId,
  proxyAccountId: AccountId,
): ProxiedAccount => ({
  id: '0x00',
  type: 'chain',
  connections: [
    {
      proxyType: proxyType,
      proxyAccountId: proxyAccountId,
      delay: 0,
    },
  ],
  chainId: '0x00',
  accountId: accountId,
  accountType: AccountType.PROXIED,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.WATCH_ONLY,
  proxyVariant: ProxyVariant.NONE,
  name: proxyType,
  walletId: 0,
  deposit: '100',
  entropyBlockNumber: 0,
  extrinsicIndex: 0,
  spawner: createAccountId('spawner'),
});

const createApi = () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  return ApiPromise.create({
    provider,
    registry,
    throwOnConnect: true,
  });
};

const createStakingTransaction = (): AnyTransaction => {
  return {
    type: 'decoded',
    section: 'staking',
    method: 'bondExtra',
    args: {
      maxAdditional: '0',
    },
  };
};

const createVotingTransaction = (): AnyTransaction => {
  return {
    type: 'decoded',
    section: 'convictionVoting',
    method: 'unlock',
    args: {
      class: 0,
      target: createAccountId('target'),
    },
  };
};

const createTransferTransaction = (): AnyTransaction => {
  return {
    type: 'decoded',
    section: 'balances',
    method: 'transferKeepAlive',
    args: {
      value: '1',
      dest: createAccountId('target'),
    },
  };
};
