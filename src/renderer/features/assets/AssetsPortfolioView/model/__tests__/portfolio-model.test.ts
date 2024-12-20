import { BN_ZERO } from '@polkadot/util';
import { allSettled, fork } from 'effector';

import { type AssetByChains } from '@/shared/core';
import { AssetsListView } from '@/entities/asset';
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
        assetId: 0,
        assetSymbol: 'DOT',
        balance: {
          free: BN_ZERO,
          reserved: BN_ZERO,
          frozen: BN_ZERO,
          locked: [],
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
        assetId: 0,
        assetSymbol: 'KSM',
        balance: {
          free: BN_ZERO,
          reserved: BN_ZERO,
          frozen: BN_ZERO,
          locked: [],
        },
      },
    ],
  },
];

// TODO: input data is a bit complex and after refactoring of internal model, chains wallet and etc should be presented.
// For now it's simpler to turn off some of the test and think about simplifying external dependencies.

describe('Portfolio model', () => {
  test('should handle activeViewChanged event', async () => {
    const scope = fork({
      values: new Map().set(portfolioModel.$activeView, AssetsListView.CHAIN_CENTRIC),
    });

    await allSettled(portfolioModel.events.activeViewChanged, { scope, params: AssetsListView.TOKEN_CENTRIC });
    expect(scope.getState(portfolioModel.$activeView)).toEqual(AssetsListView.TOKEN_CENTRIC);
  });

  xtest('should update $filteredTokens and $query stores on queryChanged event', async () => {
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

  xtest('should update $sortedTokens store on changes in $activeTokens', async () => {
    const scope = fork({
      values: new Map().set(portfolioModel._test.$defaultTokens, []),
    });

    await allSettled(portfolioModel._test.$defaultTokens, { scope, params: mockTokens });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });

  xtest('should sort tokens', async () => {
    const scope = fork({
      values: [[portfolioModel._test.$defaultTokens, Array.from(mockTokens).reverse()]],
    });

    expect(scope.getState(portfolioModel.$sortedTokens)).toEqual(mockTokens);
  });
});
