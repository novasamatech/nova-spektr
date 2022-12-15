import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import { FallbackScreen, SplashScreen } from '@renderer/components/common';
import ConfirmDialogProvider from '@renderer/context/ConfirmContext';
import GraphqlContext from '@renderer/context/GraphqlContext';
import I18Provider from '@renderer/context/I18nContext';
// import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import Paths from '@renderer/routes/paths';
import routesConfig from './routes';
import { useAccount } from './services/account/accountService';

const SPLASH_SCREEN_DELAY = Math.random() * 300 + 200; // 300ms - 500ms

const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(routesConfig);
  const { getAccounts } = useAccount();

  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setShowSplashScreen(false), SPLASH_SCREEN_DELAY);

    (async () => {
      const accounts = await getAccounts();
      setIsAccountsLoading(false);

      if (accounts.length === 0) {
        navigate(Paths.ONBOARDING, { replace: true });
      }
    })();
  }, []);

  // const onAutoLoginFail = (errorMsg: string) => {
  //   console.warn(errorMsg);
  // };

  const content = showSplashScreen || isAccountsLoading ? <SplashScreen /> : appRoutes;

  return (
    <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
      <NetworkProvider>
        <I18Provider>
          <ConfirmDialogProvider>
            <GraphqlContext>{content}</GraphqlContext>
          </ConfirmDialogProvider>
        </I18Provider>
      </NetworkProvider>
    </ErrorBoundary>
  );
};

export default App;
