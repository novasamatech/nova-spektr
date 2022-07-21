import { Outlet } from 'react-router-dom';

import Navigation from './Navigation/Navigation';
import Footer from './Footer/Footer';

const PrimaryLayout = () => {
  return (
    <>
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

export default PrimaryLayout;
