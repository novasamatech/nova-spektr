import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { FallbackScreen } from '@renderer/components/common';
import { CreateWalletProvider } from '@renderer/widgets/CreateWallet';
import { walletModel } from '@renderer/entities/wallet';
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
  const wallets = useUnit(walletModel.$wallets);

  const [showSplashScreen, setShowSplashScreen] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(
      (wallets) => {
        setShowSplashScreen(false);

        if (wallets.length === 0) {
          navigate(Paths.ONBOARDING, { replace: true });
        } else {
          navigate(Paths.ASSETS, { replace: true });
        }
      },
      SPLASH_SCREEN_DELAY,
      wallets,
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, [wallets.length]);

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
