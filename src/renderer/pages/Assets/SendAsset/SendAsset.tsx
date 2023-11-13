import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { SendAssetModal } from '@widgets/SendAssetModal';

export const SendAsset = () => {
  return (
    <AssetRouteGuard redirectPath={Paths.ASSETS}>
      {(chain, asset) => <SendAssetModal chain={chain} asset={asset} />}
    </AssetRouteGuard>
  );
};
