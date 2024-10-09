import { Suspense, lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import { Paths } from '@shared/routes';
import { MainLayout } from '@widgets/Layout';

import { Assets, ReceiveAsset, SendAsset } from './Assets';
import { Onboarding } from './Onboarding';
import { PageLoadingState } from './PageLoadingState';
import { Currency, Matrix, Networks, ReferendumData, Overview as Settings } from './Settings';

// features with lower priority - can be loaded later

const Notifications = lazy(() => import('./Notifications/Notifications').then((m) => ({ default: m.Notifications })));
const Operations = lazy(() => import('./Operations/Operations').then((m) => ({ default: m.Operations })));
const Basket = lazy(() => import('./Basket').then((m) => ({ default: m.Basket })));
const Governance = lazy(() => import('./Governance').then((m) => ({ default: m.Governance })));
const Staking = lazy(() => import('./Staking').then((m) => ({ default: m.Staking })));
const Contacts = lazy(() => import('./AddressBook').then((m) => ({ default: m.Contacts })));
const CreateContact = lazy(() => import('./AddressBook').then((m) => ({ default: m.CreateContact })));
const EditContact = lazy(() => import('./AddressBook').then((m) => ({ default: m.EditContact })));

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
      {
        path: Paths.STAKING,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Staking />
          </Suspense>
        ),
      },
      {
        path: Paths.GOVERNANCE,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Governance />
          </Suspense>
        ),
      },
      {
        path: Paths.NOTIFICATIONS,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Notifications />
          </Suspense>
        ),
      },
      {
        path: Paths.ADDRESS_BOOK,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Contacts />
          </Suspense>
        ),
        children: [
          {
            path: Paths.CREATE_CONTACT,
            element: (
              <Suspense fallback={<PageLoadingState />}>
                <CreateContact />
              </Suspense>
            ),
          },
          {
            path: Paths.EDIT_CONTACT,
            element: (
              <Suspense fallback={<PageLoadingState />}>
                <EditContact />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: Paths.OPERATIONS,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Operations />
          </Suspense>
        ),
      },
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
      {
        path: Paths.BASKET,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Basket />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
