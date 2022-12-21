import { ButtonLink, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import Paths from '@renderer/routes/paths';

const InactiveChain = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center mt-10 mb-5">
      <Icon as="img" name="noResults" size={380} />
      <p className="text-neutral text-3xl font-bold">{t('staking.overview.networkDisabledLabel')}</p>
      <p className="text-neutral-variant text-base font-normal">{t('staking.overview.networkDisabledDescription')}</p>
      <ButtonLink className="mt-5" to={Paths.NETWORK} variant="fill" pallet="primary" weight="lg">
        {t('staking.overview.networkSettingsLink')}
      </ButtonLink>
    </div>
  );
};

export default InactiveChain;
