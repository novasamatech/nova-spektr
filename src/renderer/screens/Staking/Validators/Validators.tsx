import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const Validators = () => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('staking.validators.subtitle')}</h1>
      </div>
    </div>
  );
};

export default Validators;
