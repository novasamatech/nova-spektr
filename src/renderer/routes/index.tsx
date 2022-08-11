import { RouteObject } from 'react-router-dom';

import Layouts from '@renderer/components/layout';
import Screens from '@renderer/screens';
import Paths from './paths';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
const routesConfig: RouteObject[] = [
  { path: Paths.LOGIN, element: <Screens.Login /> },
  {
    path: Paths.ONBOARDING,
    element: <Layouts.Onboarding />,
    children: [
      { index: true, element: <Screens.Onboarding.Welcome /> },
      { path: Paths.WATCH_ONLY, element: <Screens.Onboarding.WatchOnly /> },
      { path: Paths.PARITY, element: <Screens.Onboarding.Parity /> },
      // { path: Paths.LEDGER, element: <Screens.Onboarding.LedgerFlow /> },
    ],
  },
  {
    path: '/',
    element: <Layouts.PrimaryLayout />,
    children: [
      { index: true, element: <Screens.Balances /> },
      { path: Paths.DASHBOARD, element: <Screens.Dashboard /> },
      { path: Paths.WALLETS, element: <Screens.Wallets /> },
      { path: Paths.ADDRESS_BOOK, element: <Screens.AddressBook /> },
      { path: Paths.OPERATIONS, element: <Screens.Operations /> },
      { path: Paths.TRANSFER, element: <Screens.Transfer /> },
      { path: Paths.ASSETS, element: <Screens.Assets /> },
      { path: Paths.BALANCES, element: <Screens.Balances /> },
      { path: Paths.CHAT_DEV, element: <Screens.ChatDev /> },
      { path: Paths.CAMERA_DEV, element: <Screens.CameraDev /> },
      { path: Paths.SETTINGS, element: <Screens.Settings /> },
    ],
  },
];

export default routesConfig;
