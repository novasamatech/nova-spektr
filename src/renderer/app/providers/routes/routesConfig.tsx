import { Navigate, RouteObject } from 'react-router-dom';

import Layouts from '@renderer/components/layout';
import { Paths } from './paths';
import * as Screens from '@renderer/pages';

// React router v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
export const routesConfig: RouteObject[] = [
  { path: Paths.ONBOARDING, element: <Screens.Onboarding /> },
  {
    path: Paths.ROOT,
    element: <Layouts.PrimaryLayout />,
    children: [
      { index: true, element: <Navigate to={Paths.ASSETS} replace /> },
      {
        path: Paths.ASSETS,
        element: <Screens.Assets.AssetsList />,
        children: [
          { path: Paths.SEND_ASSET, element: <Screens.Assets.SendAsset /> },
          { path: Paths.RECEIVE_ASSET, element: <Screens.Assets.ReceiveAsset /> },
        ],
      },
      { path: Paths.OPERATIONS, element: <Screens.Operations /> },
      { path: Paths.NOTIFICATIONS, element: <Screens.Notifications /> },
      {
        path: Paths.ADDRESS_BOOK,
        element: <Screens.AddressBook.Contacts />,
        children: [
          { path: Paths.CREATE_CONTACT, element: <Screens.AddressBook.CreateContact /> },
          { path: Paths.EDIT_CONTACT, element: <Screens.AddressBook.EditContact /> },
        ],
      },
      {
        path: Paths.SETTINGS,
        element: <Screens.Settings.Overview />,
        children: [
          { path: Paths.NETWORK, element: <Screens.Settings.Networks /> },
          { path: Paths.MATRIX, element: <Screens.Settings.Matrix /> },
        ],
      },
      {
        path: Paths.STAKING,
        element: <Screens.Staking.Overview />,
        children: [
          { path: Paths.BOND, element: <Screens.Staking.Bond /> },
          { path: Paths.UNSTAKE, element: <Screens.Staking.Unstake /> },
          { path: Paths.RESTAKE, element: <Screens.Staking.Restake /> },
          { path: Paths.STAKE_MORE, element: <Screens.Staking.StakeMore /> },
          { path: Paths.REDEEM, element: <Screens.Staking.Redeem /> },
          { path: Paths.DESTINATION, element: <Screens.Staking.Destination /> },
          { path: Paths.VALIDATORS, element: <Screens.Staking.ChangeValidators /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
