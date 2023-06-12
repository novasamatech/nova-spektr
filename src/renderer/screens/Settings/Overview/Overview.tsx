import { Outlet } from 'react-router-dom';

import { useI18n } from '@renderer/context/I18nContext';
import { Header } from '@renderer/components/common';
import { GeneralActions, MatrixAction, SocialLinks, Version } from './components';

export const Overview = () => {
  const { t } = useI18n();

  return (
    <>
      <div className="h-full flex flex-col">
        <Header title={t('settings.title')} />

        <section className="w-full h-full overflow-y-auto bg-main-app-background">
          <div className="w-[546px] flex flex-col gap-y-4 mx-auto py-4">
            <GeneralActions />
            <MatrixAction />
            <SocialLinks />
            <Version />
          </div>
        </section>
      </div>

      <Outlet />
    </>
  );
};
