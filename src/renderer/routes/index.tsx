import TestRoute from '../screens/TestRoute/TestRoute';
import Routes from './routes';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
const routesConfig = [
  { path: Routes.TEST, element: <TestRoute /> },
  { path: '/', element: <div>Main page</div> },
];

export default routesConfig;
