import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { FallbackScreen } from '@renderer/components/common';
import { CreateWalletProvider } from '@widgets/CreateWallet';
import { WalletDetailsProvider } from '@widgets/WalletDetails';
import { walletModel } from '@entities/wallet';
import { ROUTES_CONFIG } from '@pages/index';
import { Paths } from '@shared/routes';
import {
  ConfirmDialogProvider,
  StatusModalProvider,
  I18Provider,
  MatrixProvider,
  NetworkProvider,
  GraphqlProvider,
  MultisigChainProvider,
} from './providers';
import { KeyConstructor } from '@features/wallets';

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
  }, [isLoadingWallets, wallets.length]);

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
                    <KeyConstructor isOpen={true} onClose={noop} onConfirm={noop} />
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
