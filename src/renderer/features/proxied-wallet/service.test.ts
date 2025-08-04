import { AccountType, CryptoType, type ProxiedAccount, type ProxyType, ProxyVariant, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Section } from '@/domains/network';

import { proxyService } from './service';

function createProxy(proxyType: ProxyType): ProxiedAccount {
  return {
    id: '0x00',
    type: 'chain',
    connections: [
      {
        proxyType: proxyType,
        proxyAccountId: '0x00' as AccountId,
        delay: 0,
      },
    ],
    chainId: '0x00',
    accountId: '0x00' as AccountId,
    accountType: AccountType.PROXIED,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.WATCH_ONLY,
    proxyVariant: ProxyVariant.NONE,
    name: proxyType,
    walletId: 0,
  };
}

type PermissionTestCase = {
  route: ProxyType[];
  call: Section;
  expected: boolean;
};

describe('proxy service', () => {
  it.each<PermissionTestCase>([
    // positive - narrowing
    { route: ['Any', 'Staking'], call: 'Staking', expected: true },
    { route: ['NonTransfer', 'Governance'], call: 'ConvictionVoting', expected: true },
    { route: ['Any', 'NonTransfer', 'Governance'], call: 'ConvictionVoting', expected: true },
    // { route: ['NonTransfer', 'Any', 'Governance'], call: 'ConvictionVoting', expected: true },

    // positive - same proxy types in route
    { route: ['Any', 'Auction', 'Auction'], call: 'Auctions', expected: true },
    { route: ['Staking', 'Staking'], call: 'Staking', expected: true },

    // ToDo: return once permissions check fixed
    // // negative - narrowing
    // { route: ['Staking', 'Any'], call: 'Staking', expected: false },
    // { route: ['Staking', 'NonTransfer'], call: 'Staking', expected: false },
    // // negative - non transfer
    // { route: ['NonTransfer'], call: 'Balances', expected: false },
    // // negative - not overlapping proxy types
    // { route: ['Staking', 'Governance'], call: 'Staking', expected: false },
    // { route: ['Staking', 'Governance'], call: 'ConvictionVoting', expected: false },
  ])('should correctly calculate route permission', ({ route, call, expected }) => {
    const accounts = route.map(createProxy);
    const result = proxyService.checkPermission(accounts, call);
    expect(result.success).toBe(expected);
  });
});
