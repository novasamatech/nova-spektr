import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { FallbackScreen } from '@renderer/components/common';
import { CreateWalletProvider } from '@renderer/widgets/CreateWallet';
import { accountModel } from '@renderer/entities/wallet';
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

export const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(routesConfig);
  const accounts = useUnit(accountModel.$accounts);

  const [showSplashScreen, setShowSplashScreen] = useState(true);

  useEffect(() => {
    if (accounts.length === 0) {
      navigate(Paths.ONBOARDING, { replace: true });
    } else {
      setTimeout(() => setShowSplashScreen(false), SPLASH_SCREEN_DELAY);
    }
  }, [accounts.length]);

  const getContent = () => {
    if (showSplashScreen) return null;

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
                <GraphqlProvider>
                  {getContent()}
                  <CreateWalletProvider />
                </GraphqlProvider>
              </ConfirmDialogProvider>
            </MatrixProvider>
          </MultisigChainProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};
