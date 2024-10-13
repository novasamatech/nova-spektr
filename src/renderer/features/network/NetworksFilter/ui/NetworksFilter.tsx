import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/app/providers';
import { SearchInput } from '@/shared/ui';
import { networksFilterModel } from '../model/networks-filter-model';

type Props = {
  className?: string;
};

export const NetworksFilter = ({ className }: Props) => {
  const { t } = useI18n();

  const filterQuery = useUnit(networksFilterModel.$filterQuery);

  useEffect(() => {
    networksFilterModel.events.formInitiated();
  }, []);

  return (
    <SearchInput
      wrapperClass={className}
      placeholder={t('settings.networks.searchPlaceholder')}
      value={filterQuery}
      onChange={networksFilterModel.events.queryChanged}
    />
  );
};
