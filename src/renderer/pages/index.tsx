import { Navigate, RouteObject } from 'react-router-dom';

import { MainLayout } from '@widgets/Layout';
import { Paths } from '@shared/routes';
import { Onboarding } from './Onboarding';
import { Assets, ReceiveAsset, SendAsset } from './Assets';
import { Operations } from './Operations/Operations';
import { Notifications } from './Notifications/Notifications';
import { Contacts, CreateContact, EditContact } from './AddressBook';
import { Overview as Settings, Matrix, Currency, Networks } from './Settings';
import { Overview as Staking, ChangeValidators, Restake, Destination, StakeMore } from './Staking';

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
        element: <Assets />,
        children: [
          { path: Paths.TRANSFER_ASSET, element: <SendAsset /> },
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
          { path: Paths.RESTAKE, element: <Restake /> },
          { path: Paths.STAKE_MORE, element: <StakeMore /> },
          { path: Paths.DESTINATION, element: <Destination /> },
          { path: Paths.VALIDATORS, element: <ChangeValidators /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
