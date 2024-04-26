import { fork, allSettled } from 'effector';

import { AssetsPageView } from '@entities/asset';
import { assetsSettingsModel } from '@features/assets';
import { assetsModel } from '../assets-model';

describe('pages/Assets/Assets/model/assets-model', () => {
  test('should update $title on assets view change', async () => {
    const scope = fork({
      values: new Map().set(assetsSettingsModel.$assetsView, AssetsPageView.TOKEN_CENTRIC),
    });

    await allSettled(assetsSettingsModel.events.assetsViewChanged, { scope, params: AssetsPageView.CHAIN_CENTRIC });

    expect(scope.getState(assetsModel.$title)).toEqual('balances.title');
  });
});
