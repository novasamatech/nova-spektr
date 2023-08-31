import { fork, allSettled } from 'effector';

import { useCrossChain } from '@renderer/shared/api/cross-chain';
import * as sendAssetModel from '../../model/send-asset';

jest.mock('@renderer/shared/api/cross-chain', () => ({
  useCrossChain: jest.fn().mockReturnValue({
    fetchXcmConfig: jest.fn().mockResolvedValue(null),
    getXcmConfig: jest.fn(),
    saveXcmConfig: jest.fn(),
  }),
}));

describe('widgets/SendAssetModal/model/send-asset', () => {
  test('should save to localStorage', async () => {
    const spyFetchXcmConfig = jest.fn().mockImplementation(() => {
      console.log(123);

      return 2;
    });
    const spyGetXcmConfig = jest.fn().mockReturnValue(2);
    const spySaveXcmConfig = jest.fn().mockReturnValue(2);

    (useCrossChain as jest.Mock).mockImplementation(() => ({
      fetchXcmConfig: spyFetchXcmConfig,
      getXcmConfig: spyGetXcmConfig,
      saveXcmConfig: spySaveXcmConfig,
    }));

    const scope = fork();
    await allSettled(sendAssetModel.events.xcmConfigRequested, { scope });

    expect(spyGetXcmConfig).toHaveBeenCalled();
    expect(spyFetchXcmConfig).toHaveBeenCalled();
    expect(spySaveXcmConfig).toHaveBeenCalled();
    expect(scope.getState(sendAssetModel.$finalConfig)).toEqual(2);
  });
});
