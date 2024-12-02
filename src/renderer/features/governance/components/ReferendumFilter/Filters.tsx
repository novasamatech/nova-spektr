import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect } from '@/shared/ui';
import { Box, Select } from '@/shared/ui-kit';
import { filterModel } from '../../model/filter';

import { TRACK_OPTIONS } from './constants';

export const Filters = () => {
  const { t } = useI18n();

  const query = useUnit(filterModel.$query);
  const selectedTrackIds = useUnit(filterModel.$selectedTrackIds);
  const selectedVoteId = useUnit(filterModel.$selectedVoteId);
  const isFiltersSelected = useUnit(filterModel.$isFiltersSelected);

  if (query) {
    return null;
  }

  return (
    <Box direction="row" horizontalAlign="space-between" verticalAlign="center" shrink={0}>
      <div className="grid grid-cols-[200px,104px] gap-x-4">
        <MultiSelect
          placeholder={t('governance.filters.tracks')}
          multiPlaceholder={t('governance.filters.tracks')}
          selectedIds={selectedTrackIds}
          options={TRACK_OPTIONS.map(({ id, value }) => ({ id, value, element: t(value) }))}
          onChange={(value) => filterModel.events.selectedTracksChanged(value.map(({ id }) => id))}
        />
        <Select
          placeholder={t('governance.filters.vote')}
          value={selectedVoteId}
          onChange={filterModel.events.selectedVoteChanged}
        >
          <Select.Item value="voted">{t('governance.voted')}</Select.Item>
          <Select.Item value="notVoted">{t('governance.filters.notVoted')}</Select.Item>
        </Select>
      </div>

      {Boolean(isFiltersSelected) && (
        <Button variant="text" className="h-8.5" onClick={() => filterModel.events.filtersReset()}>
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </Box>
  );
};
