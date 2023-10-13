import { useNavigate } from 'react-router-dom';

import { AssetRouteGuard } from '@renderer/features/assets';
import { Paths } from '@renderer/shared/routes';
import { ReceiveAssetModal } from '@renderer/widgets';

export const ReceiveAsset = () => {
  const navigate = useNavigate();

  return (
    <AssetRouteGuard redirectPath={Paths.ASSETS}>
      {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
    </AssetRouteGuard>
  );
};
