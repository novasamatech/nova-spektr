import { Navigate, RouteObject } from 'react-router-dom';

import { MainLayout } from '@renderer/widgets';
import { Paths } from '@renderer/shared/routes';
import { Onboarding } from './Onboarding';
import { AssetsList, ReceiveAsset, SendAsset } from './Assets';
import { Operations } from './Operations/Operations';
import { Notifications } from './Notifications/Notifications';
import { Contacts, CreateContact, EditContact } from './AddressBook';
import { Overview as Settings, Matrix, Currency, Networks } from './Settings';
import {
  Overview as Staking,
  Bond,
  ChangeValidators,
  Redeem,
  Restake,
  Unstake,
  Destination,
  StakeMore,
} from './Staking';

// React routes v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
export const ROUTES_CONFIG: RouteObject[] = [
  { path: Paths.ONBOARDING, element: <Onboarding /> },
  {
    path: Paths.ROOT,
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to={Paths.ASSETS} replace /> },
      {
        path: Paths.ASSETS,
        element: <AssetsList />,
        children: [
          { path: Paths.SEND_ASSET, element: <SendAsset /> },
          { path: Paths.RECEIVE_ASSET, element: <ReceiveAsset /> },
        ],
      },
      { path: Paths.OPERATIONS, element: <Operations /> },
      { path: Paths.NOTIFICATIONS, element: <Notifications /> },
      {
        path: Paths.ADDRESS_BOOK,
        element: <Contacts />,
        children: [
          { path: Paths.CREATE_CONTACT, element: <CreateContact /> },
          { path: Paths.EDIT_CONTACT, element: <EditContact /> },
        ],
      },
      {
        path: Paths.SETTINGS,
        element: <Settings />,
        children: [
          { path: Paths.NETWORK, element: <Networks /> },
          { path: Paths.CURRENCY, element: <Currency /> },
          { path: Paths.MATRIX, element: <Matrix /> },
        ],
      },
      {
        path: Paths.STAKING,
        element: <Staking />,
        children: [
          { path: Paths.BOND, element: <Bond /> },
          { path: Paths.UNSTAKE, element: <Unstake /> },
          { path: Paths.RESTAKE, element: <Restake /> },
          { path: Paths.STAKE_MORE, element: <StakeMore /> },
          { path: Paths.REDEEM, element: <Redeem /> },
          { path: Paths.DESTINATION, element: <Destination /> },
          { path: Paths.VALIDATORS, element: <ChangeValidators /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
