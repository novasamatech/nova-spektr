import { memo } from 'react';
import { Outlet } from 'react-router-dom';

import { createSlot, useSlot } from '@/shared/di';

import { Navigation } from './Navigation';

export const navigationHeaderSlot = createSlot();

export const AppShell = memo(() => {
  const headerNodes = useSlot(navigationHeaderSlot);

  return (
    <div className="animate-in fade-in flex h-full">
      <aside className="border-r-container-border bg-left-navigation-menu-background flex w-[240px] shrink-0 flex-col gap-y-6 border-r p-4">
        {headerNodes}
        <Navigation />
      </aside>
      <main className="bg-main-app-background flex-1">
        <Outlet />
      </main>
    </div>
  );
});
