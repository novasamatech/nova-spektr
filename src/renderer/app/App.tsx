import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useRoutes, useSearchParams } from 'react-router-dom';

import { logger } from '@/shared/config/utils';
import { faviconModel } from '@/shared/lib/favicon-model';
import { ConfirmDialogProvider } from '@/shared/providers';
import { deepLinkService } from '@/domains/app';
import { navigationModel } from '@/features/navigation';
import { ROUTES_CONFIG } from '@/pages/index';

import { bootstrap } from './bootstrap';
import { GraphqlProvider, StatusModalProvider } from './providers';

logger.init();
bootstrap();

export const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(ROUTES_CONFIG);
  const [searchParams, setSearchParams] = useSearchParams();
  const faviconUrl = useUnit(faviconModel.$faviconUrl);

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
    <>
      <Helmet>
        <link rel="icon" type="image/png" href={faviconUrl} />
      </Helmet>
      <ConfirmDialogProvider>
        <StatusModalProvider>
          <GraphqlProvider>{appRoutes}</GraphqlProvider>
        </StatusModalProvider>
      </ConfirmDialogProvider>
    </>
  );
};
