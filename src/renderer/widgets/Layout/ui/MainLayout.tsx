import { Outlet } from 'react-router-dom';

import { Navigation } from '@/features/navigation';
import { SelectWalletPairing, WalletSelect } from '@/features/wallets';

export const MainLayout = () => (
  <div className="flex h-screen animate-in fade-in">
    <aside className="z-20 flex w-[240px] shrink-0 flex-col gap-y-6 border-r border-r-container-border bg-left-navigation-menu-background p-4">
      <WalletSelect action={<SelectWalletPairing />} />
      <Navigation />
    </aside>
    <main className="flex-1 bg-main-app-background">
      <Outlet />
    </main>
  </div>
);
