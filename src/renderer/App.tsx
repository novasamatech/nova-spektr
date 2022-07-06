import { useRoutes } from 'react-router-dom';

import NetworkConnector from './components/NetworkConnector';
import routesConfig from './routes';

const App = () => {
  const appRoutes = useRoutes(routesConfig);

  return (
    <>
      <NetworkConnector />
      {appRoutes}
    </>
  );
};

export default App;
