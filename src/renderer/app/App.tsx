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
  const [searchParams, setSearchParams] = useSearchParams();

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
      deepLinkService.handleDeepLink({ searchParams });
    }
  }, [searchParams]);

  // Update URL with remaining params after deep link processing
  useEffect(() => {
    const unsubscribe = deepLinkService.urlShouldUpdate.watch((remainingParams) => {
      const newParams = new URLSearchParams();
      Object.entries(remainingParams).forEach(([key, value]) => {
        if (value != null) {
          newParams.set(key, String(value));
        }
      });
      setSearchParams(newParams, { replace: true });
    });

    return unsubscribe;
  }, [setSearchParams]);

  return (
    <ConfirmDialogProvider>
      <StatusModalProvider>
        <GraphqlProvider>{appRoutes}</GraphqlProvider>
      </StatusModalProvider>
    </ConfirmDialogProvider>
  );
};
