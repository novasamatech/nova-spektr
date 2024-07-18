import { Outlet } from 'react-router-dom';

import { Navigation } from '@features/navigation';
import { SelectWalletPairing, WalletSelect } from '@features/wallets';

export const MainLayout = () => (
  <div className="flex h-screen">
    <aside className="w-[240px] z-20 flex gap-y-6 flex-col p-4 bg-left-navigation-menu-background border-r border-r-container-border">
      <WalletSelect action={<SelectWalletPairing />} />
      <Navigation />
    </aside>
    <main className="flex-1 bg-main-app-background">
      <Outlet />
    </main>
  </div>
);
