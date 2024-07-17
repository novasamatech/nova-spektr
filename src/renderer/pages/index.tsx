import { Navigate, type RouteObject } from 'react-router-dom';

import { MainLayout } from '@widgets/Layout';
import { Paths } from '@shared/routes';
import { Onboarding } from './Onboarding';
import { Assets, ReceiveAsset, SendAsset } from './Assets';
import { Operations } from './Operations/Operations';
import { Notifications } from './Notifications/Notifications';
import { Contacts, CreateContact, EditContact } from './AddressBook';
import { Currency, Matrix, Networks, ReferendumData, Overview as Settings } from './Settings';
import { Governance } from './Governance';
import { Staking } from './Staking';
import { Basket } from './Basket';

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
      { path: Paths.STAKING, element: <Staking /> },
      { path: Paths.GOVERNANCE, element: <Governance /> },
      { path: Paths.NOTIFICATIONS, element: <Notifications /> },
      {
        path: Paths.ADDRESS_BOOK,
        element: <Contacts />,
        children: [
          { path: Paths.CREATE_CONTACT, element: <CreateContact /> },
          { path: Paths.EDIT_CONTACT, element: <EditContact /> },
        ],
      },
      { path: Paths.OPERATIONS, element: <Operations /> },
      {
        path: Paths.SETTINGS,
        element: <Settings />,
        children: [
          { path: Paths.NETWORK, element: <Networks /> },
          { path: Paths.MATRIX, element: <Matrix /> },
          { path: Paths.CURRENCY, element: <Currency /> },
          { path: Paths.REFERENDUM_DATA, element: <ReferendumData /> },
        ],
      },
      { path: Paths.BASKET, element: <Basket /> },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
