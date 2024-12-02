import { BN_ZERO } from '@polkadot/util';
import { allSettled, fork } from 'effector';

import { type AssetByChains } from '@/shared/core';
import { portfolioModel } from '@/features/assets';
import { ModalType, Step } from '../../lib/types';
import { assetTransactionModel } from '../asset-transaction-model';

const mockAsset = {
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
  totalBalance: {
    free: BN_ZERO,
    reserved: BN_ZERO,
    frozen: BN_ZERO,
    locked: [],
  },
} as AssetByChains;

describe('widgets/AssetTransactionModal/model/add-transaction-model', () => {
  test('shoild update stores on transferStarted', async () => {
    const scope = fork({});
    await allSettled(portfolioModel.events.transferStarted, { scope, params: mockAsset });

    expect(scope.getState(assetTransactionModel.$step)).toEqual(Step.INIT);
    expect(scope.getState(assetTransactionModel.$modalType)).toEqual(ModalType.TRANSFER);
    expect(scope.getState(assetTransactionModel.$assetWithChains)).toEqual(mockAsset);
  });

  test('should update stores on receiveStarted', async () => {
    const scope = fork({});
    await allSettled(portfolioModel.events.receiveStarted, { scope, params: mockAsset });

    expect(scope.getState(assetTransactionModel.$step)).toEqual(Step.INIT);
    expect(scope.getState(assetTransactionModel.$modalType)).toEqual(ModalType.RECEIVE);
    expect(scope.getState(assetTransactionModel.$assetWithChains)).toEqual(mockAsset);
  });

  test('should change $step and reset stores on flowClosed', async () => {
    const scope = fork({});
    await allSettled(assetTransactionModel.output.flowClosed, { scope });

    expect(scope.getState(assetTransactionModel.$step)).toEqual(Step.NONE);
    expect(scope.getState(assetTransactionModel.$modalType)).toEqual(null);
    expect(scope.getState(assetTransactionModel.$assetWithChains)).toEqual(null);
  });
});
