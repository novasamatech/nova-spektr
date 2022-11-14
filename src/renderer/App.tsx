import { ApolloProvider } from '@apollo/client';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import createApolloClient from '@renderer/graphql';
import { FallbackScreen, SplashScreen } from '@renderer/components/common';
import I18Provider from '@renderer/context/I18nContext';
// import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import ConfirmContext from '@renderer/context/ConfirmContext';
import { useWallet } from '@renderer/services/wallet/walletService';
import Paths from '@renderer/routes/paths';
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
    <I18Provider>
      <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
        <ApolloProvider client={createApolloClient()}>
          <NetworkProvider>
            <ConfirmContext>
              {/*<MatrixProvider onAutoLoginFail={onAutoLoginFail}>{appRoutes}</MatrixProvider>*/}
              {appRoutes}
            </ConfirmContext>
          </NetworkProvider>
        </ApolloProvider>
      </ErrorBoundary>
    </I18Provider>
  );
};

export default App;
