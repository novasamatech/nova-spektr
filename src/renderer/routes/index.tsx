import { RouteObject } from 'react-router-dom';

import Layouts from '@renderer/components/layout';
import Screens from '@renderer/screens';
import Paths from './paths';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
const routesConfig: RouteObject[] = [
  {
    path: Paths.ONBOARDING,
    element: <Screens.Onboarding.Welcome />,
  },
  {
    path: '/',
    element: <Layouts.PrimaryLayout />,
    children: [
      { index: true, element: <Screens.Balances /> },
      { path: Paths.ADDRESS_BOOK, element: <Screens.AddressBook /> },
      { path: Paths.SIGNING, element: <Screens.Signing /> },
      { path: Paths.CREATE_MULTISIG_ACCOUNT, element: <Screens.CreateMultisigAccount /> },
      { path: Paths.OPERATIONS, element: <Screens.Operations /> },
      { path: Paths.BALANCES, element: <Screens.Balances /> },
      { path: Paths.CAMERA_DEV, element: <Screens.CameraDev /> },
      { path: Paths.CHAT_DEV, element: <Screens.ChatDev /> },
      { path: Paths.NOTIFICATIONS, element: <Screens.Notifications /> },
      {
        path: Paths.SETTINGS,
        children: [
          { index: true, element: <Screens.Settings.Overview /> },
          { path: Paths.NETWORK, element: <Screens.Settings.Networks /> },
          { path: Paths.MATRIX, element: <Screens.Settings.Matrix /> },
        ],
      },
      {
        path: Paths.STAKING,
        children: [
          { index: true, element: <Screens.Staking.Overview /> },
          { path: Paths.BOND, element: <Screens.Staking.Bond /> },
          { path: Paths.UNSTAKE, element: <Screens.Staking.Unstake /> },
          { path: Paths.RESTAKE, element: <Screens.Staking.Restake /> },
          { path: Paths.STAKE_MORE, element: <Screens.Staking.StakeMore /> },
          { path: Paths.REDEEM, element: <Screens.Staking.Redeem /> },
          { path: Paths.DESTINATION, element: <Screens.Staking.Destination /> },
          { path: Paths.VALIDATORS, element: <Screens.Staking.SetValidators /> },
        ],
      },
    ],
  },
];

export default routesConfig;
