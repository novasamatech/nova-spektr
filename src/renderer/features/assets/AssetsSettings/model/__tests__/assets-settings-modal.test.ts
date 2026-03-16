import { allSettled, fork } from 'effector';

import { AssetsListView } from '@/entities/asset';
import { assetsSettingsModel } from '../assets-settings-modal';

describe('features/assets/AssetsSettings/model/assets-settings-model', () => {
  test('should have default value for $hideZeroBalances', () => {
    const scope = fork();

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(false);
  });

  test('should update $hideZeroBalances on change', async () => {
    const scope = fork({
      values: new Map().set(assetsSettingsModel.$hideZeroBalances, false),
    });

    await allSettled(assetsSettingsModel.events.hideZeroBalancesChanged, { scope, params: true });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(true);
  });

  test('should have default value for $assetsView', () => {
    const scope = fork();

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(AssetsListView.TOKEN_CENTRIC);
  });

  test('should update $assetsView on change', async () => {
    const scope = fork({
      values: new Map().set(assetsSettingsModel.$assetsView, AssetsListView.TOKEN_CENTRIC),
    });

    await allSettled(assetsSettingsModel.events.assetsViewChanged, { scope, params: AssetsListView.CHAIN_CENTRIC });

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(AssetsListView.CHAIN_CENTRIC);
  });
});
