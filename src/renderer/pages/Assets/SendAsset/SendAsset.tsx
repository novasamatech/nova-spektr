import { useUnit } from 'effector-react';

import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { CheckPermission, OperationType, walletModel } from '@entities/wallet';
import { Transfer } from '@widgets/Transfer';

export const SendAsset = () => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const activeAccounts = useUnit(walletModel.$activeAccounts);

  return (
    <CheckPermission
      operationType={OperationType.TRANSFER}
      wallet={activeWallet}
      accounts={activeAccounts}
      redirectPath={Paths.ASSETS}
    >
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <Transfer chain={chain} asset={asset} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
