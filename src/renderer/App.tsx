import { useRoutes } from 'react-router-dom';

// import NetworkConnector from './components/NetworkConnector';
import I18Provider from '@renderer/context/I18Context';
import routesConfig from './routes';

const App = () => {
  const appRoutes = useRoutes(routesConfig);

  return (
    <>
      {/*<NetworkConnector />*/}
      <I18Provider>{appRoutes}</I18Provider>
    </>
  );
};

export default App;
