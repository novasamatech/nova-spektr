import { allSettled, fork } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { AssetsListView } from '@/shared/constants';
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

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(AssetsListView.TOKEN);
  });

  test('should set $assetsView to value from localStorageService', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockReturnValue(AssetsListView.TOKEN);

    const scope = fork();

    await allSettled(assetsSettingsModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsSettingsModel.$hideZeroBalances)).toEqual(AssetsListView.TOKEN);
  });

  test('should update $assetsView on change', async () => {
    const newValue = AssetsListView.CHAIN;
    jest.spyOn(localStorageService, 'saveToStorage').mockReturnValue(newValue);

    const scope = fork({
      values: new Map().set(assetsSettingsModel.$assetsView, AssetsListView.TOKEN),
    });

    await allSettled(assetsSettingsModel.events.assetsViewChanged, { scope, params: newValue });

    expect(scope.getState(assetsSettingsModel.$assetsView)).toEqual(newValue);
  });
});
