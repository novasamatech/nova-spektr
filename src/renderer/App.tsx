import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import { FallbackScreen } from '@renderer/components/common';
import ConfirmDialogProvider from '@renderer/context/ConfirmContext';
import GraphqlContext from '@renderer/context/GraphqlContext';
import I18Provider from '@renderer/context/I18nContext';
import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import Paths from '@renderer/routes/paths';
import routesConfig from './routes';
import { useAccount } from './services/account/accountService';
import { MultisigChainProvider } from './context/MultisigChainContext/MultisigChainContext';

const SPLASH_SCREEN_DELAY = 400;

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
          <MatrixProvider>
            <MultisigChainProvider>
              <ConfirmDialogProvider>
                <GraphqlContext>{getContent()}</GraphqlContext>
              </ConfirmDialogProvider>
            </MultisigChainProvider>
          </MatrixProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};

export default App;
