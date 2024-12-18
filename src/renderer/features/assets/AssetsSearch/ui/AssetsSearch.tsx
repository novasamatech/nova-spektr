import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Box, SearchInput } from '@/shared/ui-kit';
import { assetsSearchModel } from '../model/assets-search-model';

export const AssetsSearch = () => {
  const { t } = useI18n();

  const query = useUnit(assetsSearchModel.$query);

  return (
    <Box width="280px">
      <SearchInput
        value={query}
        placeholder={t('balances.searchPlaceholder')}
        onChange={assetsSearchModel.events.queryChanged}
      />
    </Box>
  );
};
