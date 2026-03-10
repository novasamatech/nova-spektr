import { useUnit } from 'effector-react';
import { memo } from 'react';
import { Outlet } from 'react-router-dom';

import { createSlot, useSlot } from '@/shared/di';
import { cnTw } from '@/shared/lib/utils';
import { sidebarModel } from '../model/sidebar-model';

import { Favicon } from './Favicon';
import { Navigation } from './Navigation';
import { NotificationsPortal } from './NotificationsPortal';

export const navigationHeaderSlot = createSlot<{ folded: boolean }>();
export const modalsSlot = createSlot();

export const AppShell = memo(() => {
  const modals = useSlot(modalsSlot);
  const folded = useUnit(sidebarModel.$folded);
  const headerNodes = useSlot(navigationHeaderSlot, { props: { folded } });

  return (
    <div className="flex h-full animate-in fade-in">
      <Favicon />
      <aside
        className={cnTw(
          'flex shrink-0 flex-col gap-y-6 overflow-hidden border-r border-r-container-border bg-left-navigation-menu-background py-4 transition-all duration-200 ease-in-out',
          folded ? 'w-16 px-2' : 'w-[240px] px-4',
        )}
      >
        {headerNodes}
        <Navigation />
      </aside>
      <main className="flex-1 bg-main-app-background">
        <Outlet />
      </main>
      {modals}
      <NotificationsPortal />
    </div>
  );
});
