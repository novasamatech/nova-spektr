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
      { path: Paths.ADDRESS_BOOK, element: <Screens.AddressBook /> },
      { path: Paths.MULTISIG, element: <Screens.MultisigOperations /> },
      { path: Paths.HISTORY, element: <Screens.History /> },
      { path: Paths.BALANCES, element: <Screens.Balances /> },
      { path: Paths.STAKING, element: <Screens.Staking /> },
      { path: Paths.CHAT_DEV, element: <Screens.ChatDev /> },
      { path: Paths.CAMERA_DEV, element: <Screens.CameraDev /> },
      {
        path: Paths.SETTINGS,
        children: [
          { index: true, element: <Screens.Settings.Overview /> },
          { path: Paths.NETWORK, element: <Screens.Settings.Networks /> },
          { path: Paths.CREDENTIALS, element: <Screens.Settings.Credentials /> },
        ],
      },
    ],
  },
];

export default routesConfig;
