import { Trans } from 'react-i18next';

import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  chainName?: string;
};

const NoAccounts = ({ chainName }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center mt-10 mb-5">
      <Icon as="img" name="noResults" size={380} />
      <p className="text-neutral text-3xl font-bold">{t('staking.overview.noAccountsLabel')}</p>
      <p className="text-neutral-variant text-base font-normal">
        <Trans t={t} i18nKey="staking.overview.noAccountsDescription" values={{ chainName }} />
      </p>
    </div>
  );
};

export default NoAccounts;
