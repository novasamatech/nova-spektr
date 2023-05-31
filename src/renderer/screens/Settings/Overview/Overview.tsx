import { useI18n } from '@renderer/context/I18nContext';
import { Header } from '@renderer/components/common';
import { GeneralActions, MatrixAction, SocialLinks, Version } from './components';

const Overview = () => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col">
      <Header title={t('settings.title')} />

      <div className="w-full h-full overflow-y-auto bg-main-app-background">
        <section className="w-[546px] flex flex-col gap-y-4 mx-auto py-4">
          <GeneralActions />
          <MatrixAction />
          <SocialLinks />
          <Version />
        </section>
      </div>
    </div>
  );
};

export default Overview;
