import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { FallbackScreen } from '@renderer/components/common';
import { CreateWalletProvider } from '@renderer/widgets/CreateWallet';
import { WalletDetailsProvider } from '@renderer/widgets/WalletDetails';
import { walletModel } from '@renderer/entities/wallet';
import { ROUTES_CONFIG } from '@renderer/pages';
import { Paths } from '@renderer/shared/routes';
import {
  ConfirmDialogProvider,
  StatusModalProvider,
  I18Provider,
  MatrixProvider,
  NetworkProvider,
  GraphqlProvider,
  MultisigChainProvider,
} from './providers';

const SPLASH_SCREEN_DELAY = 450;

export const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(ROUTES_CONFIG);

  const wallets = useUnit(walletModel.$wallets);
  const isLoadingWallets = useUnit(walletModel.$isLoadingWallets);

  const [splashScreenLoading, setSplashScreenLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setSplashScreenLoading(false), SPLASH_SCREEN_DELAY);
  }, []);

  useEffect(() => {
    if (isLoadingWallets) return;

    const path = wallets.length > 0 ? Paths.ASSETS : Paths.ONBOARDING;
    navigate(path, { replace: true });
  }, [isLoadingWallets, wallets]);

  const getContent = () => {
    if (splashScreenLoading || isLoadingWallets) return null;

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
                <StatusModalProvider>
                  <GraphqlProvider>
                    {getContent()}
                    <CreateWalletProvider />
                  <WalletDetailsProvider />
                </GraphqlProvider>
                </StatusModalProvider>
              </ConfirmDialogProvider>
            </MatrixProvider>
          </MultisigChainProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};
