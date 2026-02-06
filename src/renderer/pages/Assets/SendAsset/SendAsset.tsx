import { useUnit } from 'effector-react';
import { useCallback } from 'react';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AssetRouteGuard } from '@/features/assets';
import { navigationModel } from '@/features/navigation';
import { DefaultTransfer, defaultTransferModel } from '@/widgets/Transfer';

export const SendAsset = () => {
  const wallet = useUnit(walletSelect.$selectedWallet);
  const redirectPath = useUnit(defaultTransferModel.$redirectAfterSubmitPath);

  const handleClose = useCallback(() => {
    navigationModel.events.navigateTo(redirectPath ?? Paths.ASSETS);
  }, [redirectPath]);

  return (
    <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <DefaultTransfer chain={chain} asset={asset} onClose={handleClose} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
