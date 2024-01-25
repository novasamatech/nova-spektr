import { useUnit } from 'effector-react';

import { CheckPermissionWithRedirect, OperationType } from '@shared/api/permission';
import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { SendAssetModal } from '@widgets/SendAssetModal';
import { walletModel } from '@entities/wallet';

export const SendAsset = () => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  return (
    <CheckPermissionWithRedirect
      wallet={activeWallet}
      accounts={activeAccounts}
      operationType={OperationType.TRANSFER}
      redirectPath={Paths.ASSETS}
    >
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <SendAssetModal chain={chain} asset={asset} />}
      </AssetRouteGuard>
    </CheckPermissionWithRedirect>
  );
};
