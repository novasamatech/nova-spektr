import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { ReceiveAssetModal } from '@widgets/ReceiveAssetModal';
import { CheckPermissionWithRedirect, OperationType, walletModel } from '@entities/wallet';

export const ReceiveAsset = () => {
  const navigate = useNavigate();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  return (
    <CheckPermissionWithRedirect
      wallet={activeWallet}
      accounts={activeAccounts}
      operationType={OperationType.RECEIVE}
      redirectPath={Paths.ASSETS}
    >
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
      </AssetRouteGuard>
    </CheckPermissionWithRedirect>
  );
};
