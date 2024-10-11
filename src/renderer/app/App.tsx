import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';

import { logger } from '@shared/config/utils';
import { WalletType, kernelModel } from '@shared/core';
import { Paths, createLink } from '@shared/routes';
import { basketModel } from '@entities/basket';
import { governanceModel } from '@entities/governance';
import { networkModel } from '@entities/network';
import { notificationModel } from '@entities/notification';
import { proxyModel } from '@entities/proxy';
import { walletModel } from '@entities/wallet';
import { multisigsModel } from '@processes/multisigs';
import { assetsSettingsModel } from '@features/assets';
import { navigationModel } from '@features/navigation';
import { proxiesModel } from '@features/proxies';
import { walletPairingModel } from '@features/wallets';
import { CreateWalletProvider } from '@widgets/CreateWallet';
import { WalletDetailsProvider } from '@widgets/WalletDetails';
import { ROUTES_CONFIG } from '@pages/index';

import {
  ConfirmDialogProvider,
  GraphqlProvider,
  MatrixProvider,
  MultisigChainProvider,
  StatusModalProvider,
} from './providers';

logger.init();

kernelModel.events.appStarted();
governanceModel.events.governanceStarted();
proxiesModel.events.workerStarted();
walletModel.events.walletStarted();
networkModel.events.networkStarted();
proxyModel.events.proxyStarted();
assetsSettingsModel.events.assetsStarted();
notificationModel.events.notificationsStarted();
basketModel.events.basketStarted();
multisigsModel.events.multisigsDiscoveryStarted();

export const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(ROUTES_CONFIG);

  useGate(navigationModel.gates.flow, { navigate });

  const wallets = useUnit(walletModel.$wallets);
  const isLoadingWallets = useUnit(walletModel.$isLoadingWallets);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('step') || !url.searchParams.has('loginToken')) return;

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
    if (isLoadingWallets || wallets.length > 0) return;

    navigate(Paths.ONBOARDING, { replace: true });
  }, [isLoadingWallets, wallets.length]);

  return (
    <MultisigChainProvider>
      <MatrixProvider>
        <ConfirmDialogProvider>
          <StatusModalProvider>
            <GraphqlProvider>
              {appRoutes}
              <CreateWalletProvider />
              <WalletDetailsProvider />
            </GraphqlProvider>
          </StatusModalProvider>
        </ConfirmDialogProvider>
      </MatrixProvider>
    </MultisigChainProvider>
  );
};
