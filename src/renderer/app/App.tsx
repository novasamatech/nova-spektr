import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import { FallbackScreen } from '@renderer/components/common';
import { useAccount } from '../entities/account/lib/accountService';
import {
  ConfirmDialogProvider,
  I18Provider,
  MatrixProvider,
  NetworkProvider,
  GraphqlProvider,
  MultisigChainProvider,
  Paths,
  routesConfig,
} from './providers';

const SPLASH_SCREEN_DELAY = 450;

const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(routesConfig);
  const { getAccounts } = useAccount();

  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setShowSplashScreen(false), SPLASH_SCREEN_DELAY);

    getAccounts().then((accounts) => {
      setIsAccountsLoading(false);

      if (accounts.length === 0) {
        navigate(Paths.ONBOARDING, { replace: true });
      }
    });
  }, []);

  const getContent = () => {
    if (showSplashScreen || isAccountsLoading) return null;

    document.querySelector('.splash_placeholder')?.remove();

    return appRoutes;
  };

  return (
    <I18Provider>
      <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
        <NetworkProvider>
          <MultisigChainProvider>
            <MatrixProvider>
              <ConfirmDialogProvider>
                <GraphqlProvider>{getContent()}</GraphqlProvider>
              </ConfirmDialogProvider>
            </MatrixProvider>
          </MultisigChainProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};

export default App;
