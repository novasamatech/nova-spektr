import { useUnit } from 'effector-react';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AssetRouteGuard } from '@/features/assets';
import { ReceiveAssetModal } from '@/features/assets-transaction';

export const ReceiveAsset = () => {
  const activeWallet = useUnit(walletSelect.$selectedWallet);

  return (
    <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
