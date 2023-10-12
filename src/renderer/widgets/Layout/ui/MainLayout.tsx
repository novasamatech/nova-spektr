import { Outlet } from 'react-router-dom';

import { Navigation } from '@renderer/features/navigation';
import { WalletSelect } from '@renderer/features/wallets';

export const MainLayout = () => (
  <div className="flex h-screen">
    <aside>
      <WalletSelect />
      <Navigation />
    </aside>
    <main className="flex-1 bg-main-app-background">
      <Outlet />
    </main>
  </div>
);
