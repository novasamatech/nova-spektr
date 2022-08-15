import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18Context';

const Onboarding = () => {
  // const navigate = useNavigate();
  const { onLocaleChange } = useI18n();

  useEffect(() => {
    // TODO: check wallets and navigate
    console.log('check wallets and navigate');
    // navigate(Paths.BALANCES, { replace: true });
  }, []);

  const onLanguageSwitch = async () => {
    try {
      await onLocaleChange('ru');
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col h-screen bg-stripes bg-cover">
      <Outlet />

      <Button className="w-max" variant="fill" pallet="primary" onClick={onLanguageSwitch}>
        Switch language
      </Button>
    </main>
  );
};

export default Onboarding;
