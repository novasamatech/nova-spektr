import { useI18n } from '@app/providers';
import { type ReferendumTimelineRecord, type ReferendumTimelineRecordStatus } from '@shared/api/governance';
import { FootnoteText, OperationStatus } from '@shared/ui';

type Props = {
  item: ReferendumTimelineRecord;
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
    case 'Approved':
      return 'success' as const;

    default:
      return 'default' as const;
  }
};

export const TimelineItem = ({ item }: Props) => {
  const { t, formatDate } = useI18n();

  return (
    <div className="flex items-center justify-between">
      <FootnoteText>{formatDate(item.date, 'd MMM’yy, hh:mm')}</FootnoteText>
      <OperationStatus pallet={getStatusPalette(item.status)}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {t(`governance.timeline.status.${item.status}`)}
      </OperationStatus>
    </div>
  );
};
