import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { matchPath, useLocation, useNavigate, useRoutes, useSearchParams } from 'react-router-dom';

import { logger } from '@/shared/config/utils';
import { deepLinkService } from '@/shared/lib/deep-link';
import { ConfirmDialogProvider } from '@/shared/providers';
import { Paths } from '@/shared/routes';
import { walletModel } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { ROUTES_CONFIG } from '@/pages/index';

import { bootstrap } from './bootstrap';
import { GraphqlProvider, StatusModalProvider } from './providers';

logger.init();
bootstrap();

export const App = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const appRoutes = useRoutes(ROUTES_CONFIG);
  const [searchParams] = useSearchParams();

  useGate(navigationModel.gates.flow, { navigate });

  const wallets = useUnit(walletModel.$wallets);
  const isLoadingWallets = useUnit(walletModel.$isLoadingWallets);

  useEffect(() => {
    if (isLoadingWallets) return;

    if (wallets.length > 0 && matchPath(Paths.ONBOARDING, pathname)) {
      navigate(Paths.ASSETS, { replace: true });
    }

    if (wallets.length === 0) {
      navigate(Paths.ONBOARDING, { replace: true });
    }
  }, [isLoadingWallets, wallets.length]);

  useEffect(() => {
    if (searchParams.toString()) {
      deepLinkService.handleDeepLink({ pathname, searchParams });
    }
  }, [pathname, searchParams]);

  return (
    <ConfirmDialogProvider>
      <StatusModalProvider>
        <GraphqlProvider>{appRoutes}</GraphqlProvider>
      </StatusModalProvider>
    </ConfirmDialogProvider>
  );
};
