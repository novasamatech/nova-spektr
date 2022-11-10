import { Outlet } from 'react-router-dom';

import Navigation from './Navigation/Navigation';

const PrimaryLayout = () => {
  return (
    <div className="flex bg-cover h-screen">
      <Navigation />
      <main className="pl-10 pt-5 pr-5 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PrimaryLayout;
