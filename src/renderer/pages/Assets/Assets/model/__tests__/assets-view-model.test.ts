import { fork, allSettled } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { assetsModel } from '@entities/asset';
import { assetsViewModel } from '../assets-view-model';

describe('pages/Assets/Assets/model/assets-model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should set $hideZeroBalances to default value', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockImplementation((_, defaultValue: any) => defaultValue);

    const scope = fork();

    await allSettled(assetsViewModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsModel.$hideZeroBalances)).toEqual(false);
  });

  test('should set $hideZeroBalances to value from localStorageService', async () => {
    jest.spyOn(localStorageService, 'getFromStorage').mockReturnValue(true);

    const scope = fork();

    await allSettled(assetsViewModel.events.assetsStarted, { scope });

    expect(scope.getState(assetsModel.$hideZeroBalances)).toEqual(true);
  });

  test('should update $hideZeroBalances on change', async () => {
    const newValue = true;
    jest.spyOn(localStorageService, 'saveToStorage').mockReturnValue(newValue);

    const scope = fork({
      values: new Map().set(assetsModel.$hideZeroBalances, false),
    });

    await allSettled(assetsViewModel.events.hideZeroBalancesChanged, { scope, params: newValue });

    expect(scope.getState(assetsModel.$hideZeroBalances)).toEqual(newValue);
  });
});
