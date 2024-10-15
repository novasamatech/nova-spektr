import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { type Asset, type Chain } from '@/shared/core';
import * as assetGuardModel from '../model/asset-guard';

type Props = {
  redirectPath: string;
  children?: ReactNode | ((chain: Chain, asset: Asset) => ReactNode);
};
export const AssetRouteGuard = ({ redirectPath, children }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const chain = useUnit(assetGuardModel.$chain);
  const asset = useUnit(assetGuardModel.$asset);

  useEffect(() => {
    assetGuardModel.events.navigateApiChanged({ navigate, redirectPath });
    assetGuardModel.events.validateUrlParams(searchParams);

    return () => {
      assetGuardModel.events.storeCleared();
    };
  }, [searchParams]);

  if (!chain || !asset) {
    return null;
  }

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{typeof children === 'function' ? children(chain, asset) : children}</>;
};
