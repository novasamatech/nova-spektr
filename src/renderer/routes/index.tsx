import { RouteObject } from 'react-router-dom';

import Paths from './paths';
import { PrimaryLayout } from '@renderer/components/layout';
import * as Screens from '@renderer/screens';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
const routesConfig: RouteObject[] = [
  { path: Paths.LOGIN, element: <Screens.Login /> },
  { path: Paths.ONBOARDING, element: <Screens.Onboarding /> },
  {
    path: '/',
    element: <PrimaryLayout />,
    children: [
      // { index: true, element: <Screens.Main /> },
      { path: Paths.DASHBOARD, element: <Screens.Dashboard /> },
      { path: Paths.WALLETS, element: <Screens.Wallets /> },
      { path: Paths.ADDRESS_BOOK, element: <Screens.AddressBook /> },
      { path: Paths.OPERATIONS, element: <Screens.Operations /> },
      { path: Paths.TRANSFER, element: <Screens.Transfer /> },
      { path: Paths.ASSETS, element: <Screens.Assets /> },
      { path: Paths.BALANCES, element: <Screens.Balances /> },
      { path: Paths.CHAT_DEV, element: <Screens.ChatDev /> },
      { path: Paths.SETTINGS, element: <Screens.Settings /> },
    ],
  },
];

export default routesConfig;
