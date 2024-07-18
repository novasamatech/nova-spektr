import { useUnit } from 'effector-react';

import { Paths } from '@shared/routes';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';
import { AssetRouteGuard } from '@features/assets';
import { Transfer } from '@widgets/Transfer';

export const SendAsset = () => {
  const activeWallet = useUnit(walletModel.$activeWallet);

  return (
    <CheckPermission operationType={OperationType.TRANSFER} wallet={activeWallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <Transfer chain={chain} asset={asset} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
