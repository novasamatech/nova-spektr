import { Outlet } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';

const Onboarding = () => {
  const { LocaleComponent } = useI18n();

  return (
    <main className="px-9 pt-5 pb-6 flex flex-col h-screen bg-stripes bg-cover">
      <div className="flex-1">
        <Outlet />
      </div>

      <LocaleComponent short top />
    </main>
  );
};

export default Onboarding;
