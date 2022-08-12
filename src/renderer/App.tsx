import { useRoutes } from 'react-router-dom';

import { SplashScreen } from '@renderer/components/common';
import I18Provider from '@renderer/context/I18Context';
import MatrixProvider from '@renderer/context/MatrixContext';
import NetworkProvider from '@renderer/context/NetworkContext';
import routesConfig from './routes';

// TODO: rework flow if autologin failed
const App = () => {
  const appRoutes = useRoutes(routesConfig);

  const onAutoLoginFail = (errorMsg: string) => {
    console.warn(errorMsg);
  };

  return (
    <I18Provider>
      <NetworkProvider>
        <MatrixProvider loader={<SplashScreen />} onAutoLoginFail={onAutoLoginFail}>
          {appRoutes}
        </MatrixProvider>
      </NetworkProvider>
    </I18Provider>
  );
};

export default App;
