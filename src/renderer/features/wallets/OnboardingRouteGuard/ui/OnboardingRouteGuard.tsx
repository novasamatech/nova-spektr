import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { walletModel } from '@/entities/wallet';

type Props = {
  children?: ReactNode;
};

export const OnboardingRouteGuard = ({ children }: Props) => {
  const navigate = useNavigate();

  const wallets = useUnit(walletModel.$wallets);
  const isLoadingWallets = useUnit(walletModel.$isLoadingWallets);

  useEffect(() => {
    if (!isLoadingWallets && wallets.length > 0) {
      navigate(Paths.ASSETS, { replace: true });
    }
  }, [isLoadingWallets, wallets.length, navigate]);

  if (isLoadingWallets) {
    return null;
  }

  return children;
};
