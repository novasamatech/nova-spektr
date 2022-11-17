import { Outlet } from 'react-router-dom';

import Navigation from './Navigation/Navigation';

const PrimaryLayout = () => {
  return (
    <div className="flex bg-cover h-screen">
      <Navigation />
      <main className="px-10 pt-5 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PrimaryLayout;
