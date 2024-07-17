import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import { WalletType } from '@shared/core';
import { Paths, createLink } from '@shared/routes';
import { FallbackScreen } from '@shared/ui';

import { walletModel } from '@entities/wallet';

import { walletPairingModel } from '@features/wallets';

import { CreateWalletProvider } from '@widgets/CreateWallet';
import { WalletDetailsProvider } from '@widgets/WalletDetails';

import { ROUTES_CONFIG } from '@pages/index';

import {
  ConfirmDialogProvider,
  GraphqlProvider,
  I18Provider,
  MatrixProvider,
  MultisigChainProvider,
  StatusModalProvider,
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
    const url = new URL(window.location.href);
    if (!url.searchParams.has('step') || !url.searchParams.has('loginToken')) {
      return;
    }

    const loginToken = url.searchParams.get('loginToken') as string;
    const step = url.searchParams.get('step') as string;

    url.searchParams.delete('step');
    url.searchParams.delete('loginToken');
    window.history.replaceState(null, '', url.href);

    if (step === 'settings_matrix') {
      navigate(createLink(Paths.MATRIX, {}, { loginToken: [loginToken] }));
    }
    if (step === 'multisig_wallet') {
      walletPairingModel.events.walletTypeSet(WalletType.MULTISIG);
    }
  }, []);

  useEffect(() => {
    if (isLoadingWallets || wallets.length > 0) {
      return;
    }

    navigate(Paths.ONBOARDING, { replace: true });
  }, [isLoadingWallets, wallets.length]);

  const getContent = () => {
    if (splashScreenLoading || isLoadingWallets) {
      return null;
    }

    document.querySelector('.splash_placeholder')?.remove();

    return appRoutes;
  };

  return (
    <I18Provider>
      <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
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
      </ErrorBoundary>
    </I18Provider>
  );
};
