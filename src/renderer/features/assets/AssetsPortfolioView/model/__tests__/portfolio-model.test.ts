import { BN_ZERO } from '@polkadot/util';
import { allSettled, fork } from 'effector';

import {
  type AssetByChains,
  type AssetId,
  type Chain,
  type ChainId,
  type Connection,
  type Wallet,
  ConnectionStatus,
  ConnectionType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { AssetsListView } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { portfolioModel } from '../portfolio-model';

const mockTokens: AssetByChains[] = [
  {
    name: 'Polkadot',
    precision: 10,
    priceId: 'polkadot',
    icon: {
      monochrome:
        'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/DOT.svg',
      colored: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/DOT.svg',
    },
    symbol: 'DOT',
    chains: [
      {
        chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        name: 'Polkadot',
        assetId: 0 as AssetId,
        assetSymbol: 'DOT',
        balance: {
          total: BN_ZERO,
          transferable: BN_ZERO,
          frozen: BN_ZERO,
          locked: BN_ZERO,
          balances: [],
        },
      },
    ],
  },
  {
    name: 'Kusama',
    precision: 12,
    priceId: 'kusama',
    icon: {
      monochrome:
        'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/monochrome/DOT.svg',
      colored: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v2/assets/colored/DOT.svg',
    },
    symbol: 'KSM',
    chains: [
      {
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        name: 'Kusama',
        assetId: 0 as AssetId,
        assetSymbol: 'KSM',
        balance: {
          total: BN_ZERO,
          transferable: BN_ZERO,
          frozen: BN_ZERO,
          locked: BN_ZERO,
          balances: [],
        },
      },
    ],
  },
];

const walletsWithoutAccounts: Wallet[] = [
  {
    id: 1,
    type: WalletType.POLKADOT_VAULT,
    name: 'My wallet',
    accounts: [],
  },
];
const mockWalletAccounts: AnyAccount[] = [
  {
    id: '1',
    walletId: 1,
    name: 'My base account',
    type: 'universal',
    accountId: createAccountId('1'),
    signingType: SigningType.POLKADOT_VAULT,
    cryptoType: CryptoType.SR25519,
    createdAt: Date.now(),
  },
];
const mockWallets: Wallet[] = [
  {
    id: 1,
    name: 'My first wallet',
    type: WalletType.POLKADOT_VAULT,
    accounts: mockWalletAccounts,
  },
];
const mockChainId = mockTokens[0]!.chains[0]!.chainId;
const mockChain = { chainId: mockChainId, name: 'Polkadot', assets: [], options: [] } as unknown as Chain;
const mockConnection = {
  id: 1,
  chainId: mockChainId,
  connectionType: ConnectionType.AUTO_BALANCE,
  customNodes: [],
} as Connection;

// TODO: input data is a bit complex and after refactoring of internal model, chains wallet and etc should be presented.
// For now it's simpler to turn off some of the test and think about simplifying external dependencies.

describe('Portfolio model', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  test('should handle activeViewChanged event', async () => {
    const scope = fork({
      values: new Map().set(portfolioModel.$activeView, AssetsListView.CHAIN_CENTRIC),
    });

    await allSettled(portfolioModel.events.activeViewChanged, { scope, params: AssetsListView.TOKEN_CENTRIC });
    expect(scope.getState(portfolioModel.$activeView)).toEqual(AssetsListView.TOKEN_CENTRIC);
  });

  test('should keep tokens loading while token catalog is not populated', async () => {
    const scope = fork({
      values: new Map()
        .set(accounts.__test.$populated, true)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(balanceModel.__test.$populated, true),
    });

    await allSettled(walletModel.__test.$rawWallets, { scope, params: [] });
    await allSettled(portfolioModel.events.queryChanged, { scope, params: 'DOT' });

    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(false);

    await allSettled(portfolioModel._test.$defaultTokens, { scope, params: mockTokens });

    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(true);
  });

  test('should keep tokens loading while wallets are not populated', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(accounts.__test.$populated, true)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(balanceModel.__test.$populated, true),
    });

    expect(scope.getState(walletModel.$isLoadingWallets)).toEqual(true);
    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(false);
  });

  test('should keep tokens loading while selected wallet accounts are not populated', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(accounts.__test.$populated, true)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(balanceModel.__test.$populated, true),
    });

    await allSettled(walletModel.__test.$rawWallets, { scope, params: walletsWithoutAccounts });

    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(false);
  });

  test('should allow empty state only when portfolio filtering is active', async () => {
    const scope = fork();

    expect(scope.getState(portfolioModel.$emptyStateAvailable)).toEqual(false);

    await allSettled(portfolioModel.events.queryChanged, { scope, params: 'DOT' });
    expect(scope.getState(portfolioModel.$emptyStateAvailable)).toEqual(true);

    await allSettled(portfolioModel.events.queryChanged, { scope, params: '' });
    expect(scope.getState(portfolioModel.$emptyStateAvailable)).toEqual(false);

    await allSettled(portfolioModel.events.hideZeroBalancesChanged, { scope, params: true });
    expect(scope.getState(portfolioModel.$emptyStateAvailable)).toEqual(true);
  });

  test('should treat local network data as populated without waiting for network batch', async () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({ body: () => true, available: () => true });

    const scope = fork({
      handlers: [[walletModel.populate, () => mockWallets]],
      values: new Map()
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(accounts.__test.$populated, true)
        .set(accounts.__test.$list, mockWalletAccounts)
        .set(walletSelect.__test.$selectedWalletId, mockWallets[0]!.id)
        .set(networkModel.$populated, false)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(networkModel.$connectionStatuses, { [mockChainId]: ConnectionStatus.CONNECTING })
        .set(balanceModel.__test.$populated, true),
    });

    await allSettled(walletModel.populate, { scope });
    await allSettled(networkModel.$connectionStatuses, {
      scope,
      params: { [mockChainId]: ConnectionStatus.CONNECTING },
    });
    await allSettled(networkModel.$chains, {
      scope,
      params: { [mockChainId]: mockChain } as Record<ChainId, Chain>,
    });

    expect(scope.getState(portfolioModel._test.$networkDataPopulated)).toEqual(true);
    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(true);
  });

  test('should recompute token rows when account availability handlers are registered after startup', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(accounts.__test.$populated, true)
        .set(accounts.__test.$list, mockWalletAccounts)
        .set(walletModel.__test.$rawWallets, mockWallets)
        .set(walletSelect.__test.$selectedWalletId, mockWallets[0]!.id)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(balanceModel.__test.$populated, true),
    });

    expect(scope.getState(walletSelect.$selectedAccounts).length).toBeGreaterThan(0);
    expect(scope.getState(portfolioModel.$accounts)).toEqual([]);
    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual([]);

    await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
      scope,
      params: { body: () => true, available: () => true },
    });

    expect(scope.getState(accountService.$accountAvailabilityRevision)).toBeGreaterThan(0);
    expect(scope.getState(portfolioModel.$accounts).length).toBeGreaterThan(0);
    expect(scope.getState(portfolioModel.$sortedTokens).length).toBeGreaterThan(0);
  });

  test('should keep portfolio loading while networks are connecting and no tokens are rendered', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(accounts.__test.$populated, true)
        .set(networkModel.$chains, { [mockChainId]: mockChain } as Record<ChainId, Chain>)
        .set(networkModel.$connections, { [mockChainId]: mockConnection })
        .set(networkModel.$connectionStatuses, { [mockChainId]: ConnectionStatus.CONNECTING })
        .set(balanceModel.__test.$populated, true),
    });

    await allSettled(walletModel.__test.$rawWallets, { scope, params: [] });

    expect(scope.getState(portfolioModel.$tokensPopulated)).toEqual(true);
    expect(scope.getState(portfolioModel._test.$networksLoading)).toEqual(true);
    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual([]);
    expect(scope.getState(portfolioModel.$isLoading)).toEqual(true);

    await allSettled(networkModel.$connectionStatuses, {
      scope,
      params: { [mockChainId]: ConnectionStatus.CONNECTED },
    });
    expect(scope.getState(portfolioModel._test.$networksLoading)).toEqual(false);
    expect(scope.getState(portfolioModel.$isLoading)).toEqual(false);
  });

  test.skip('should update $filteredTokens and $query stores on queryChanged event', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel.$activeView, AssetsListView.TOKEN_CENTRIC)
        .set(portfolioModel._test.$defaultTokens, mockTokens)
        .set(portfolioModel._test.$query, ''),
    });

    await allSettled(portfolioModel.events.queryChanged, { scope, params: 'DOT' });

    expect(scope.getState(portfolioModel._test.$query)).toEqual('DOT');
    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual([mockTokens[0]]);
  });

  test.skip('should update $sortedTokens store on changes in $activeTokens', async () => {
    const scope = fork({
      values: new Map().set(portfolioModel._test.$defaultTokens, []),
    });

    await allSettled(portfolioModel._test.$defaultTokens, { scope, params: mockTokens });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });

  test.skip('should sort tokens', async () => {
    const scope = fork({
      values: [[portfolioModel._test.$defaultTokens, Array.from(mockTokens).reverse()]],
    });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });
});
