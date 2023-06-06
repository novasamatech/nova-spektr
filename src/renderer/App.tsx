import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, Outlet } from 'react-router-dom';

import { FallbackScreen, SplashScreen } from '@renderer/components/common';
import ConfirmDialogProvider from '@renderer/context/ConfirmContext';
import GraphqlContext from '@renderer/context/GraphqlContext';
import I18Provider from '@renderer/context/I18nContext';
import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import Paths from '@renderer/routes/paths';
import { useAccount } from './services/account/accountService';
import { MultisigChainProvider } from './context/MultisigChainContext/MultisigChainContext';

const SPLASH_SCREEN_DELAY = Math.random() * 300 + 200; // 300ms - 500ms

const App = () => {
  const navigate = useNavigate();
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

  const content = showSplashScreen || isAccountsLoading ? <SplashScreen /> : <Outlet />;

  return (
    <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
      <NetworkProvider>
        <MatrixProvider>
          <I18Provider>
            <MultisigChainProvider>
              <ConfirmDialogProvider>
                <GraphqlContext>{content}</GraphqlContext>
              </ConfirmDialogProvider>
            </MultisigChainProvider>
          </I18Provider>
        </MatrixProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
};

export default App;
