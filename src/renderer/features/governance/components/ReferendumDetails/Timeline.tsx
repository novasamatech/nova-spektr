import { useStoreMap, useUnit } from 'effector-react';
import { format } from 'date-fns';

import { useI18n } from '@app/providers';
import { ReferendumId } from '@shared/core';
import { FootnoteText, OperationStatus, Shimmering } from '@shared/ui';
import { ReferendumTimelineRecordStatus } from '@shared/api/governance';
import { detailsAggregate } from '../../aggregates/details';

type Props = {
  referendumId: ReferendumId;
};

const getStatusPalette = (status: ReferendumTimelineRecordStatus) => {
  switch (status) {
    case 'Cancelled':
    case 'Rejected':
    case 'Killed':
      return 'error' as const;

    case 'Confirmed':
    case 'Executed':
    case 'Awarded':
      return 'success' as const;

    default:
      return 'default' as const;
  }
};

export const Timeline = ({ referendumId }: Props) => {
  const { t } = useI18n();

  const loading = useUnit(detailsAggregate.$isTimelinesLoading);
  const timeline = useStoreMap({
    store: detailsAggregate.$timelines,
    keys: [referendumId],
    fn: (timelines, [referendumId]) => timelines[referendumId] ?? [],
  });

  return (
    <div className="flex flex-col gap-3.5">
      {loading && (
        <div className="flex items-center justify-between">
          <Shimmering height={18} width={120} />
          <Shimmering height={18} width={80} />
        </div>
      )}

      {!loading &&
        timeline.map((status) => (
          <div key={status.status} className="flex items-center justify-between">
            <FootnoteText>{format(status.date, 'd MMM’yy, hh:mm')}</FootnoteText>
            <OperationStatus pallet={getStatusPalette(status.status)}>
              {t(`governance.timeline.status.${status.status}`)}
            </OperationStatus>
          </div>
        ))}
    </div>
  );
};
