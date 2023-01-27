import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const Credentials = () => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col gap-y-9">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">{t('settings.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('matrixCredentials.subTitle')}</h1>
      </div>
    </div>
  );
};

export default Credentials;
