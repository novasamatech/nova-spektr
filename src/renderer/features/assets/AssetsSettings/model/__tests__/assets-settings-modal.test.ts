import { fork, allSettled } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { AssetsPageView } from '@entities/asset';
import { assetsSettingsModel } from '../assets-settings-modal';

describe('features/assets/AssetsSettings/model/assets-settings-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $hideZeroBalances to default value', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockImplementation((_, defaultValue: any) => defaultValue);

    const scope = fork();

    await allSettled(assetsSettingsModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(false);
  });

  test('should set $hideZeroBalances to value from localStorageService', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockReturnValue(true);

    const scope = fork();

    await allSettled(assetsSettingsModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(true);
  });

  test('should update $hideZeroBalances on change', async () => {
    const newValue = true;
    jest.spyOn(localStorageService, 'saveToStorage').mockReturnValue(newValue);

    const scope = fork({
      values: new Map().set(assetsSettingsModel.$hideZeroBalances, false),
    });

    await allSettled(assetsSettingsModel.events.hideZeroBalancesChanged, { scope, params: newValue });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(newValue);
  });

  test('should set $assetsView to default value', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockImplementation((_, defaultValue: any) => defaultValue);

    const scope = fork();

    await allSettled(assetsSettingsModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(AssetsPageView.TOKEN_CENTRIC);
  });

  test('should set $assetsView to value from localStorageService', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockReturnValue(AssetsPageView.TOKEN_CENTRIC);

    const scope = fork();

    await allSettled(assetsSettingsModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(AssetsPageView.TOKEN_CENTRIC);
  });

  test('should update $assetsView on change', async () => {
    const newValue = AssetsPageView.CHAIN_CENTRIC;
    jest.spyOn(localStorageService, 'saveToStorage').mockReturnValue(newValue);

    const scope = fork({
      values: new Map().set(assetsSettingsModel.$assetsView, AssetsPageView.TOKEN_CENTRIC),
    });

    await allSettled(assetsSettingsModel.events.assetsViewChanged, { scope, params: newValue });

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(newValue);
  });
});
