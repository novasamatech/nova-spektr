import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { networksFilterModel } from '../model/networks-filter-model';
import { SearchInput } from '@shared/ui';
import { useI18n } from '@app/providers';

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
