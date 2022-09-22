import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const Credentials = () => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">{t('settings.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('matrixCredentials.subTitle')}</h1>
      </div>
    </div>
  );
};

export default Credentials;
