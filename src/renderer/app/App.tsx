import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { CreateWalletProvider } from '@widgets/CreateWallet';
import { WalletDetailsProvider } from '@widgets/WalletDetails';
import { walletModel } from '@entities/wallet';
import { ROUTES_CONFIG } from '@pages/index';
import { Paths } from '@shared/routes';
import { FallbackScreen } from '@shared/ui';
import {
  ConfirmDialogProvider,
  StatusModalProvider,
  I18Provider,
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
    if (isLoadingWallets || wallets.length > 0) return;

    navigate(Paths.ONBOARDING, { replace: true });
  }, [isLoadingWallets, wallets.length]);

  const getContent = () => {
    if (splashScreenLoading || isLoadingWallets) return null;

    document.querySelector('.splash_placeholder')?.remove();

    return appRoutes;
  };

  return (
    <I18Provider>
      <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
        <MultisigChainProvider>
          <ConfirmDialogProvider>
            <StatusModalProvider>
              <GraphqlProvider>
                {getContent()}
                <CreateWalletProvider />
                <WalletDetailsProvider />
              </GraphqlProvider>
            </StatusModalProvider>
          </ConfirmDialogProvider>
        </MultisigChainProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};
