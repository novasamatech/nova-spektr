import { useRoutes } from 'react-router-dom';

// import NetworkConnector from './components/NetworkConnector';
import I18Provider from '@renderer/context/I18Context';
import MatrixProvider from '@renderer/context/MatrixContext';
import routesConfig from './routes';

const App = () => {
  const appRoutes = useRoutes(routesConfig);

  const handleAutoLoginFail = () => {
    console.warn('autologin failed');
  };

  // <NetworkConnector />
  return (
    <I18Provider>
      <MatrixProvider loader={'loading'} onAutoLoginFail={handleAutoLoginFail}>
        {appRoutes}
      </MatrixProvider>
    </I18Provider>
  );
};

export default App;
