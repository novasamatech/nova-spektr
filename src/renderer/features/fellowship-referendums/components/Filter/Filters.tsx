import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button, MultiSelect } from '@/shared/ui';
import { Box, Select } from '@/shared/ui-kit';
import { filterModel } from '../../model/filter';

import { Search } from './Search';

export const Filters = () => {
  const { t } = useI18n();

  const query = useUnit(filterModel.$query);
  const tracks = useUnit(filterModel.$tracks);
  const selectedTrackIds = useUnit(filterModel.$selectedTracks);
  const selectedVoteId = useUnit(filterModel.$selectedVotingStatus);
  const isFiltersSelected = useUnit(filterModel.$isFiltersSelected);

  const trackFilterOptions = tracks.map(({ id, name }) => ({
    id: id.toString(),
    value: id,
    element: name.toString(),
  }));

  return (
    <Box direction="row" horizontalAlign="space-between" verticalAlign="center" shrink={0}>
      <div className="grid grid-cols-[230px,200px,104px] gap-x-4">
        <Search />
        {!query && (
          <MultiSelect
            placeholder={t('governance.filters.tracks')}
            multiPlaceholder={t('governance.filters.tracks')}
            selectedIds={selectedTrackIds.map(x => x.toString())}
            options={trackFilterOptions}
            disabled={tracks.length === 0}
            onChange={value => {
              filterModel.events.selectTracks(value.map(x => x.value));
            }}
          />
        )}

        {!query && (
          <Select
            placeholder={t('governance.filters.vote')}
            value={selectedVoteId}
            onChange={filterModel.events.selectVotingStatus}
          >
            <Select.Item value="voted">{t('governance.voted')}</Select.Item>
            <Select.Item value="notVoted">{t('governance.filters.notVoted')}</Select.Item>
          </Select>
        )}
      </div>

      {Boolean(isFiltersSelected) && (
        <Button
          variant="text"
          className="h-8.5"
          onClick={() => {
            filterModel.events.filtersReset();
            filterModel.events.queryChanged('');
          }}
        >
          {t('operations.filters.clearAll')}
        </Button>
      )}
    </Box>
  );
};
