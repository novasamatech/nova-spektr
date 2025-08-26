import { useUnit } from 'effector-react';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AssetRouteGuard } from '@/features/assets';
import { DefaultTransfer } from '@/widgets/Transfer';

export const SendAsset = () => {
  const wallet = useUnit(walletSelect.$selectedWallet);

  return (
    <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <DefaultTransfer chain={chain} asset={asset} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
