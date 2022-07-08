import Routes from './routes';
import { TestRoute, Main } from '@renderer/screens';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
const routesConfig = [
  { path: Routes.TEST, element: <TestRoute /> },
  { path: '/', element: <Main /> },
];

export default routesConfig;
