import { useUnit } from 'effector-react';
import { useCallback } from 'react';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AssetRouteGuard } from '@/features/assets';
import { navigationModel } from '@/features/navigation';
import { DefaultTransfer, defaultTransferModel } from '@/features/transfer';

export const SendAsset = () => {
  const wallet = useUnit(walletSelect.$selectedWallet);

  // Read the redirect store imperatively at close-time. The transfer flow may
  // fire `flowFinished` from inside an effector tick (e.g. on draft created),
  // so React hasn't re-rendered yet when this handler runs — a useUnit-derived
  // closure would carry the stale (initial null) value and override the
  // intended redirect. getState is correct here precisely because we want the
  // up-to-the-moment value at the click, not a subscribed snapshot.
  const handleClose = useCallback(() => {
    // eslint-disable-next-line effector/no-getState
    const path = defaultTransferModel.$redirectAfterSubmitPath.getState();
    navigationModel.events.navigateTo(path ?? Paths.ASSETS);
  }, []);

  return (
    <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) => <DefaultTransfer chain={chain} asset={asset} onClose={handleClose} />}
      </AssetRouteGuard>
    </CheckPermission>
  );
};
