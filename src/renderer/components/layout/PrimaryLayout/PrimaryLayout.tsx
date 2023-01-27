import { Outlet } from 'react-router-dom';

import Navigation from './Navigation/Navigation';

const PrimaryLayout = () => {
  return (
    <div className="flex bg-cover h-screen">
      <Navigation />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PrimaryLayout;
