import { useUnit } from 'effector-react';

import { Paths } from '@/shared/routes';
import { CheckPermission, OperationType, accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { AssetRouteGuard } from '@/features/assets';
import { DefaultTransfer, ShardsTransfer } from '@/widgets/Transfer';

export const SendAsset = () => {
  const wallet = useUnit(walletSelect.$selectedWallet);
  const accounts = useUnit(walletSelect.$selectedAccounts);
  const hasShards = accounts.find(accountUtils.isVaultShardAccount);

  return (
    <CheckPermission operationType={OperationType.TRANSFER} wallet={wallet} redirectPath={Paths.ASSETS}>
      <AssetRouteGuard redirectPath={Paths.ASSETS}>
        {(chain, asset) =>
          hasShards ? <ShardsTransfer chain={chain} asset={asset} /> : <DefaultTransfer chain={chain} asset={asset} />
        }
      </AssetRouteGuard>
    </CheckPermission>
  );
};
