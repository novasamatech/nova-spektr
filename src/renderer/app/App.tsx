import { useGate } from 'effector-react';
import { Suspense, useEffect } from 'react';
import { useNavigate, useRoutes, useSearchParams } from 'react-router-dom';

import { logger } from '@/shared/config/utils';
import { ConfirmDialogProvider } from '@/shared/providers';
import { deepLinkService } from '@/domains/app';
import { navigationModel } from '@/features/navigation';
import { NotificationsPortal } from '@/features/notifications/NotificationsPortal/NotificationsPortal';
import { ROUTES_CONFIG } from '@/pages/index';

import { bootstrap } from './bootstrap';
import { GraphqlProvider, StatusModalProvider } from './providers';

logger.init();
bootstrap();

export const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(ROUTES_CONFIG);
  const [searchParams, setSearchParams] = useSearchParams();

  useGate(navigationModel.gates.flow, { navigate });

  useEffect(() => {
    if (searchParams.toString()) {
      deepLinkService.setDeepLink({
        searchParams,
        callback: (takenKeys) => {
          const currentParams = Object.fromEntries(searchParams.entries());
          const remainingParams = Object.fromEntries(
            Object.entries(currentParams).filter(([key]) => !takenKeys.includes(key)),
          );
          setSearchParams(remainingParams, { replace: true });
        },
      });
    }
  }, [searchParams, setSearchParams]);

  return (
    <ConfirmDialogProvider>
      <StatusModalProvider>
        <GraphqlProvider>
          <Suspense fallback={null}>
            <NotificationsPortal />
          </Suspense>
          {appRoutes}
        </GraphqlProvider>
      </StatusModalProvider>
    </ConfirmDialogProvider>
  );
};
