import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType, walletModel } from '@/entities/wallet';
import { AssetRouteGuard } from '@/features/assets';
import { ReceiveAssetModal } from '@/widgets/ReceiveAssetModal';

export const ReceiveAsset = () => {
  const navigate = useNavigate();
  const activeWallet = useUnit(walletModel.$activeWallet);

  return (
    <CheckPermission operationType={OperationType.RECEIVE} wallet={activeWallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
