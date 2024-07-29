import { Outlet } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';

import { GeneralActions, SocialLinks, Version } from './components';

export const Overview = () => {
  const { t } = useI18n();

  return (
    <>
      <div className="h-full flex flex-col">
        <Header title={t('settings.title')} />

        <section className="w-full h-full overflow-y-auto mt-4">
          <div className="w-[546px] flex flex-col gap-y-4 mx-auto">
            <GeneralActions />
            <SocialLinks />
            <Version />
          </div>
        </section>
      </div>

      <Outlet />
    </>
  );
};
