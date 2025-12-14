import { memo } from 'react';
import { Outlet } from 'react-router-dom';

import { createSlot, useSlot } from '@/shared/di';

import { Navigation } from './Navigation';
import { NotificationsPortal } from './NotificationsPortal';

export const navigationHeaderSlot = createSlot();
export const modalsSlot = createSlot();

export const AppShell = memo(() => {
  const headerNodes = useSlot(navigationHeaderSlot);
  const modals = useSlot(modalsSlot);

  return (
    <div className="flex h-full animate-in fade-in">
      <aside className="flex w-[240px] shrink-0 flex-col gap-y-6 border-r border-r-container-border bg-left-navigation-menu-background p-4">
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
