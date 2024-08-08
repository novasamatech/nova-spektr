import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type ReferendumTimelineRecordStatus } from '@shared/api/governance';
import { type ReferendumId } from '@shared/core';
import { FootnoteText, OperationStatus, Shimmering } from '@shared/ui';
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
  const { t, formatDate } = useI18n();

  const isLoading = useUnit(detailsAggregate.$isTimelinesLoading);
  const timeline = useStoreMap({
    store: detailsAggregate.$timelines,
    keys: [referendumId],
    fn: (timelines, [referendumId]) => timelines[referendumId] ?? [],
  });

  return (
    <div className="flex flex-col gap-3.5">
      {isLoading && (
        <div className="flex items-center justify-between">
          <Shimmering height={18} width={120} />
          <Shimmering height={18} width={80} />
        </div>
      )}

      {!isLoading &&
        timeline.map((status) => (
          <div key={status.date.toLocaleString()} className="flex items-center justify-between">
            <FootnoteText>{formatDate(status.date, 'd MMM’yy, hh:mm')}</FootnoteText>
            <OperationStatus pallet={getStatusPalette(status.status)}>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              {t(`governance.timeline.status.${status.status}`)}
            </OperationStatus>
          </div>
        ))}
    </div>
  );
};
