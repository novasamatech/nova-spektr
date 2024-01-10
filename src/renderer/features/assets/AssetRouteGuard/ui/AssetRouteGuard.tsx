import { ReactNode, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from 'effector-react';

import * as assetGuardModel from '../model/asset-guard';
import type { Chain, Asset } from '@shared/core';

type Props = {
  redirectPath: string;
  children?: ReactNode | ((chain: Chain, asset: Asset) => ReactNode);
};
export const AssetRouteGuard = ({ redirectPath, children }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const chain = useStore(assetGuardModel.$chain);
  const asset = useStore(assetGuardModel.$asset);

  useEffect(() => {
    assetGuardModel.events.navigateApiChanged({ navigate, redirectPath });
    assetGuardModel.events.validateUrlParams(searchParams);

    return () => {
      assetGuardModel.events.storeCleared();
    };
  }, [searchParams]);

  if (!chain || !asset) return null;

  return <>{typeof children === 'function' ? children(chain, asset) : children}</>;
};
