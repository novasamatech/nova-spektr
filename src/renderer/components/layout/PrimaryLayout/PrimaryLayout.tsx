import { Outlet } from 'react-router-dom';

import Navigation from './Navigation';
import Footer from './Footer';

export const PrimaryLayout = () => {
  return (
    <>
      {/*<div className="flex ">*/}
      <div className="flex bg-stripes bg-cover h-stretch">
        <Navigation />
        <main className="pl-10 pt-5 pr-5 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  );
};
