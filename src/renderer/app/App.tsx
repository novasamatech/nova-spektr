import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';

import { logger } from '@/shared/config/utils';
import { kernelModel } from '@/shared/core';
import { ConfirmDialogProvider } from '@/shared/providers';
import { Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { governanceModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { multisigsModel } from '@/processes/multisigs';
import { assetsSettingsModel } from '@/features/assets';
import { navigationModel } from '@/features/navigation';
import { proxiesModel } from '@/features/proxies';
import { CreateWalletProvider } from '@/widgets/CreateWallet';
import { WalletDetailsProvider } from '@/widgets/WalletDetails';
import { ROUTES_CONFIG } from '@/pages/index';

import { GraphqlProvider, MultisigChainProvider, StatusModalProvider } from './providers';

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
    if (isLoadingWallets || wallets.length > 0) return;

    navigate(Paths.ONBOARDING, { replace: true });
  }, [isLoadingWallets, wallets.length]);

  return (
    <MultisigChainProvider>
      <ConfirmDialogProvider>
        <StatusModalProvider>
          <GraphqlProvider>
            {appRoutes}
            <CreateWalletProvider />
            <WalletDetailsProvider />
          </GraphqlProvider>
        </StatusModalProvider>
      </ConfirmDialogProvider>
    </MultisigChainProvider>
  );
};
