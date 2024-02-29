import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { ReceiveAssetModal } from '@widgets/ReceiveAssetModal';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';

export const ReceiveAsset = () => {
  const navigate = useNavigate();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  return (
    <CheckPermission
      operationType={OperationType.RECEIVE}
      wallet={activeWallet}
      accounts={activeAccounts}
      redirectPath={Paths.ASSETS}
    >
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
