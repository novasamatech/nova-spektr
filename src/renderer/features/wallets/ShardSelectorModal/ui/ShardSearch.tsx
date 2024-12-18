import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';
import { shardsModel } from '../model/shards-model';

export const ShardSearch = () => {
  const { t } = useI18n();

  const query = useUnit(shardsModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('balances.searchPlaceholder')}
      onChange={shardsModel.events.queryChanged}
    />
  );
};
