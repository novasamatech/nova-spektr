import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';

const Onboarding = () => {
  // const navigate = useNavigate();
  const { LocaleComponent } = useI18n();

  useEffect(() => {
    // TODO: check wallets and navigate
    console.log('check wallets and navigate');
    // navigate(Paths.BALANCES, { replace: true });
  }, []);

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col justify-between h-screen bg-stripes bg-cover">
      <div>
        <Outlet />
      </div>

      <LocaleComponent className="w-16" short top />
    </main>
  );
};

export default Onboarding;
