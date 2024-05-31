import { fork, allSettled } from 'effector';

import { AssetByChains } from '@shared/core';
import { AssetsListView } from '@entities/asset';
import { portfolioModel } from '../portfolio-model';

const mockTokens = [
  {
    name: 'Polkadot',
    precision: 10,
    priceId: 'polkadot',
    icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/assets/white/Polkadot_(DOT).svg',
    symbol: 'DOT',
    chains: [
      {
        chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        name: 'Polkadot',
        assetId: 0,
        assetSymbol: 'DOT',
        balance: {
          free: '0',
          reserved: '0',
          frozen: '0',
          locked: [],
        },
      },
    ],
    totalBalance: {
      free: '0',
      reserved: '0',
      frozen: '0',
      locked: [],
    },
  },
  {
    name: 'Kusama',
    precision: 12,
    priceId: 'kusama',
    icon: 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/assets/white/Kusama_(KSM).svg',
    symbol: 'KSM',
    chains: [
      {
        chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
        name: 'Kusama',
        assetId: 0,
        assetSymbol: 'KSM',
        balance: {
          free: '0',
          reserved: '0',
          frozen: '0',
          locked: [],
        },
      },
    ],
    totalBalance: {
      free: '0',
      reserved: '0',
      frozen: '0',
      locked: [],
    },
  },
] as AssetByChains[];

describe('features/assets/AssetsPortfolioView/model/portfolio-model', () => {
  test('should handle activeViewChanged event', async () => {
    const scope = fork({
      values: new Map().set(portfolioModel.$activeView, AssetsListView.CHAIN_CENTRIC),
    });

    await allSettled(portfolioModel.events.activeViewChanged, { scope, params: AssetsListView.TOKEN_CENTRIC });
    expect(scope.getState(portfolioModel.$activeView)).toEqual(AssetsListView.TOKEN_CENTRIC);
  });

  test('should update $filtredTokens and $query stores on queryChanged event', async () => {
    const scope = fork({
      values: new Map()
        .set(portfolioModel._$activeTokens, mockTokens)
        .set(portfolioModel._$query, '')
        .set(portfolioModel._$filtredTokens, []),
    });

    await allSettled(portfolioModel.events.queryChanged, { scope, params: 'DOT' });

    expect(scope.getState(portfolioModel._$query)).toEqual('DOT');
    expect(scope.getState(portfolioModel._$filtredTokens)).toEqual([mockTokens[0]]);
  });

  test('should update $sortedTokens store on changes in $activeTokens', async () => {
    const scope = fork({
      values: [[portfolioModel._$activeTokens, []]],
    });

    await allSettled(portfolioModel._$activeTokens, { scope, params: mockTokens });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });

  test('should update $sortedTokens store on changes in $filtredTokens', async () => {
    const scope = fork({
      values: [
        [portfolioModel._$filtredTokens, []],
        [portfolioModel._$query, 'DOT'],
      ],
    });

    await allSettled(portfolioModel._$filtredTokens, { scope, params: mockTokens });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });
});
