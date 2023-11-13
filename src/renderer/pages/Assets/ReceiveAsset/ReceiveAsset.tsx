import { useNavigate } from 'react-router-dom';

import { AssetRouteGuard } from '@features/assets';
import { Paths } from '@shared/routes';
import { ReceiveAssetModal } from '@widgets/ReceiveAssetModal';

export const ReceiveAsset = () => {
  const navigate = useNavigate();

  return (
    <AssetRouteGuard redirectPath={Paths.ASSETS}>
      {(chain, asset) => <ReceiveAssetModal chain={chain} asset={asset} onClose={() => navigate(Paths.ASSETS)} />}
    </AssetRouteGuard>
  );
};
