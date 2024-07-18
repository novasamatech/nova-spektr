import { type PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

export const MainLayout = ({ children }: PropsWithChildren) => (
  <div className="flex h-screen">
    {children}
    <main className="flex-1 bg-main-app-background">
      <Outlet />
    </main>
  </div>
);
