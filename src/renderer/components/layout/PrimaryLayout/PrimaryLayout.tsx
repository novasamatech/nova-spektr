import { Outlet } from 'react-router-dom';

import Navigation from './Navigation/Navigation';

const PrimaryLayout = () => {
  return (
    <div className="flex h-screen">
      <Navigation />
      <main className="flex-1 bg-main-app-background">
        <Outlet />
      </main>
    </div>
  );
};

export default PrimaryLayout;
