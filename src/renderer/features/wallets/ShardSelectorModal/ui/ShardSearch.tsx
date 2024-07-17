import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';

import { SearchInput } from '@shared/ui';

import { shardsModel } from '../model/shards-model';

export const ShardSearch = () => {
  const { t } = useI18n();

  const query = useUnit(shardsModel.$query);

  return (
    <SearchInput
      value={query}
      placeholder={t('balances.searchPlaceholder')}
      wrapperClass="mb-4 ml-2 mr-5"
      onChange={shardsModel.events.queryChanged}
    />
  );
};
