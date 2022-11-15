import { ButtonBack } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useStaking } from '@renderer/services/staking/stakingService';

const Validators = () => {
  const { t } = useI18n();
  const { validators } = useStaking();

  console.log(validators);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack />
        <p className="font-semibold text-2xl text-neutral-variant">{t('staking.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('staking.bond.validatorsSubtitle')}</h1>
      </div>
    </div>
  );
};

export default Validators;
