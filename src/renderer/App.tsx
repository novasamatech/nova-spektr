import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import GraphqlContext from '@renderer/context/GraphqlContext';
import { FallbackScreen, SplashScreen } from '@renderer/components/common';
import ConfirmDialogProvider from '@renderer/context/ConfirmContext';
import I18Provider from '@renderer/context/I18nContext';
// import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import Paths from '@renderer/routes/paths';
import { useWallet } from '@renderer/services/wallet/walletService';
import routesConfig from './routes';

const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(routesConfig);
  const { getWallets } = useWallet();

  const [isWalletsLoading, setIsWalletsLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      const wallets = await getWallets();
      setIsWalletsLoading(false);

      if (wallets.length === 0) {
        navigate(Paths.ONBOARDING, { replace: true });
      }
    };

    fetchWallets();
  }, []);

  // const onAutoLoginFail = (errorMsg: string) => {
  //   console.warn(errorMsg);
  // };

  if (isWalletsLoading) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
      <I18Provider>
        <GraphqlContext>
          <NetworkProvider>
            <ConfirmDialogProvider>
              {/*<MatrixProvider onAutoLoginFail={onAutoLoginFail}>{appRoutes}</MatrixProvider>*/}
              {appRoutes}
            </ConfirmDialogProvider>
          </NetworkProvider>
        </GraphqlContext>
      </I18Provider>
    </ErrorBoundary>
  );
};

export default App;
