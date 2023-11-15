import { fork, allSettled } from 'effector';

import * as sendAssetModel from '../../model/send-asset';
import * as service from '@shared/api/xcm';

jest.mock('@shared/api/xcm', () => ({
  __esModule: true,
  ...jest.requireActual('@shared/api/xcm'),
}));

jest.mock('@app/providers', () => ({
  useMatrix: jest.fn(),
}));

describe('widgets/SendAssetModal/model/send-asset', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should call xcmConfigRequested and all related effects', async () => {
    const spyFetchXcmConfig = jest.spyOn(service, 'fetchXcmConfig');
    spyFetchXcmConfig.mockImplementation();

    const spyGetXcmConfig = jest.spyOn(service, 'getXcmConfig');
    spyGetXcmConfig.mockImplementation();

    const spySaveXcmConfig = jest.spyOn(service, 'saveXcmConfig');
    spySaveXcmConfig.mockImplementation();

    const scope = fork();
    await allSettled(sendAssetModel.events.xcmConfigRequested, { scope });

    expect(spyGetXcmConfig).toHaveBeenCalled();
    expect(spyFetchXcmConfig).toHaveBeenCalled();
    expect(spySaveXcmConfig).toHaveBeenCalled();
  });

  test('should call xcmConfigRequested and get final config', async () => {
    jest.spyOn(service, 'fetchXcmConfig').mockResolvedValue('config' as any);
    jest.spyOn(service, 'getXcmConfig').mockImplementation();
    jest.spyOn(service, 'saveXcmConfig').mockImplementation();

    const scope = fork();
    await allSettled(sendAssetModel.events.xcmConfigRequested, { scope });

    expect(scope.getState(sendAssetModel.$finalConfig)).toEqual('config');
  });
});
