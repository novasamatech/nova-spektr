import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useNavigate, useRoutes } from 'react-router-dom';

import { FallbackScreen, SplashScreen } from '@renderer/components/common';
import ConfirmDialogProvider from '@renderer/context/ConfirmContext';
import GraphqlContext from '@renderer/context/GraphqlContext';
import I18Provider from '@renderer/context/I18nContext';
// import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import Paths from '@renderer/routes/paths';
import routesConfig from './routes';
import { useAccount } from './services/account/accountService';

const App = () => {
  const navigate = useNavigate();
  const appRoutes = useRoutes(routesConfig);
  const { getAccounts } = useAccount();

  const [isAccountsLoading, setIsAccountsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      const accounts = await getAccounts();
      setIsAccountsLoading(false);

      if (accounts.length === 0) {
        navigate(Paths.ONBOARDING, { replace: true });
      }
    };

    fetchAccounts();
  }, []);

  // const onAutoLoginFail = (errorMsg: string) => {
  //   console.warn(errorMsg);
  // };

  if (isAccountsLoading) {
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
