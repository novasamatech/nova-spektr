import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { MultiSelect, Select } from '@shared/ui';
import { referendumFilterModel } from '../model/referendum-filter-model';
import { trackOptions, voteOptions } from '../common/constants';

export const ReferendumFilters = () => {
  const { t } = useI18n();
  const selectedTrackIds = useUnit(referendumFilterModel.$selectedTrackIds);
  const selectedVoteId = useUnit(referendumFilterModel.$selectedVoteId);
  const query = useUnit(referendumFilterModel.$query);

  if (query) return null;

  return (
    <div className="flex gap-x-4">
      <MultiSelect
        className="w-[200px]"
        placeholder={t('governance.filters.tracks')}
        multiPlaceholder={t('governance.filters.tracks')}
        selectedIds={selectedTrackIds}
        options={trackOptions.map(({ id, value }) => ({
          id,
          value,
          element: t(value),
        }))}
        onChange={referendumFilterModel.events.selectedTracksChanged}
      />
      <Select
        className="w-[103px]"
        placeholder={t('governance.filters.vote')}
        selectedId={selectedVoteId}
        options={voteOptions.map(({ id, value }) => ({
          id,
          value,
          element: t(value),
        }))}
        onChange={referendumFilterModel.events.selectedVoteChanged}
      />
    </div>
  );
};
