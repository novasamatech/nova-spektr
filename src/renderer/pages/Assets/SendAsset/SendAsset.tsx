import { AssetRouteGuard } from '@renderer/features/assets';
import { Paths } from '@renderer/app/providers';
import { SendAssetModal } from '@renderer/widgets';

export const SendAsset = () => {
  return (
    <AssetRouteGuard redirectPath={Paths.ASSETS}>
      {(chain, asset) => <SendAssetModal chain={chain} asset={asset} />}
    </AssetRouteGuard>
  );
};
