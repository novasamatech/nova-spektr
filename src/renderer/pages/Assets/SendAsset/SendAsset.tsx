import { useNavigate } from 'react-router-dom';

import { AssetRouteGuard } from '@renderer/features/assets';
import { Paths } from '@renderer/app/providers';
import { SendAssetModal } from '@renderer/widgets';

export const SendAsset = () => {
  const navigate = useNavigate();

  return (
    <AssetRouteGuard redirectPath={Paths.ASSETS}>
      {(chain, asset) => <SendAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
    </AssetRouteGuard>
  );
};
