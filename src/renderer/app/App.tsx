import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';

import { logger } from '@/shared/config/utils';
import { ConfirmDialogProvider } from '@/shared/providers';
import { Paths } from '@/shared/routes';
import { walletModel } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { ROUTES_CONFIG } from '@/pages/index';

import { initModel } from './modelInit';
import { GraphqlProvider, MultisigChainProvider, StatusModalProvider } from './providers';

logger.init();
initModel();

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
          <GraphqlProvider>{appRoutes}</GraphqlProvider>
        </StatusModalProvider>
      </ConfirmDialogProvider>
    </MultisigChainProvider>
  );
};
