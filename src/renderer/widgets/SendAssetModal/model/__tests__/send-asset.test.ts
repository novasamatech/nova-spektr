import { fork, allSettled } from 'effector';

import { sendAssetModel } from '../../model/send-asset';
import { xcmService } from '@shared/api/xcm';

describe('widgets/SendAssetModal/model/send-asset', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should call xcmConfigRequested and all related effects', async () => {
    const spyFetchXcmConfig = jest.spyOn(xcmService, 'fetchXcmConfig');
    spyFetchXcmConfig.mockImplementation();

    const spySaveXcmConfig = jest.spyOn(xcmService, 'saveXcmConfig');
    spySaveXcmConfig.mockImplementation();

    const scope = fork();
    await allSettled(sendAssetModel.events.xcmConfigRequested, { scope });

    expect(spyFetchXcmConfig).toHaveBeenCalled();
    expect(spySaveXcmConfig).toHaveBeenCalled();
  });

  test('should call xcmConfigRequested and get final config', async () => {
    jest.spyOn(xcmService, 'fetchXcmConfig').mockResolvedValue('config' as any);
    jest.spyOn(xcmService, 'saveXcmConfig').mockImplementation();

    const scope = fork();
    await allSettled(sendAssetModel.events.xcmConfigRequested, { scope });

    expect(scope.getState(sendAssetModel.$finalConfig)).toEqual('config');
  });
});
