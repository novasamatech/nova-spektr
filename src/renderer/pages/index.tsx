import { Suspense, lazy } from 'react';
import { Navigate, Outlet, type RouteObject } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { AppShell } from '@/features/app-shell';
import { OnboardingRouteGuard, ShellRouteGuard } from '@/features/wallets';

import { Assets, ReceiveAsset, SendAsset } from './Assets';
import { Onboarding } from './Onboarding';
import { PageLoadingState } from './PageLoadingState';
import { Currency, Networks, ReferendumData, Overview as Settings } from './Settings';

// features with lower priority - can be loaded later

const Notifications = lazy(() =>
  import('./Notifications/Notifications').then(({ Notifications }) => ({ default: Notifications })),
);
const Operations = lazy(() => import('./Operations/Operations').then(({ Operations }) => ({ default: Operations })));
const Basket = lazy(() => import('./Basket').then(({ Basket }) => ({ default: Basket })));
const Governance = lazy(() => import('./Governance').then(({ Governance }) => ({ default: Governance })));
const GovernanceReferendumDetails = lazy(() =>
  import('./Governance/ui/GovernanceReferendumDetails').then(({ GovernanceReferendumDetails }) => ({
    default: GovernanceReferendumDetails,
  })),
);
const GovernanceReferendumList = lazy(() =>
  import('./Governance/ui/GovernanceReferendumList').then(({ GovernanceReferendumList }) => ({
    default: GovernanceReferendumList,
  })),
);

const Staking = lazy(() => import('./Staking').then(({ Staking }) => ({ default: Staking })));
const Contacts = lazy(() => import('./AddressBook').then(({ Contacts }) => ({ default: Contacts })));
const CreateContact = lazy(() => import('./AddressBook').then(({ CreateContact }) => ({ default: CreateContact })));
const EditContact = lazy(() => import('./AddressBook').then(({ EditContact }) => ({ default: EditContact })));
const Fellowship = lazy(() => import('./Fellowship/ui/Fellowship').then(({ Fellowship }) => ({ default: Fellowship })));
const Dapp = lazy(() => import('./Dapp').then(({ DappPage }) => ({ default: DappPage })));

// React routes v6 hint:
// https://github.com/remix-run/react-router/blob/main/docs/upgrading/v5.md#use-useroutes-instead-of-react-router-config
export const ROUTES_CONFIG: RouteObject[] = [
  {
    path: Paths.ONBOARDING,
    element: (
      <OnboardingRouteGuard>
        <Onboarding />
      </OnboardingRouteGuard>
    ),
  },
  {
    path: Paths.ROOT,
    element: (
      <ShellRouteGuard>
        <AppShell />
      </ShellRouteGuard>
    ),
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
        children: [
          {
            path: Paths.GOVERNANCE_REFERENDUM_DEFAULT_CHAIN,
            element: (
              <Suspense fallback={null}>
                <GovernanceReferendumDetails />
              </Suspense>
            ),
          },
          {
            path: Paths.GOVERNANCE_LIST,
            element: (
              <Suspense fallback={<PageLoadingState />}>
                <GovernanceReferendumList />
              </Suspense>
            ),
            children: [
              {
                path: Paths.GOVERNANCE_REFERENDUM,
                element: (
                  <Suspense fallback={null}>
                    <GovernanceReferendumDetails />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
      {
        path: Paths.FELLOWSHIP,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Fellowship />
          </Suspense>
        ),
        children: [
          {
            path: Paths.FELLOWSHIP_LIST,
            element: <Outlet />,
          },
        ],
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
      {
        path: Paths.DAPP,
        element: (
          <Suspense fallback={<PageLoadingState />}>
            <Dapp />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to={Paths.ASSETS} replace /> },
];
