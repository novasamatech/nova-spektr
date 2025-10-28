import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';
import { generatePath } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { FootnoteText } from '@/shared/ui';
import { type FeedEventReferendum, trackService } from '@/domains/collectives';
import { navigationModel } from '@/features/navigation';
import { fellowshipProfileFeature } from '../model/feature';

const getTitle = (record: FeedEventReferendum, t: TFunction): string => {
  if (record.referendumStatus === 'created') {
    return t('fellowship.profile.activityFeed.referendumCreated', { number: record.referendumId });
  } else {
    const isRetention = trackService.isRetentionTrack(record.referendumTrackId);
    const type = isRetention ? 'Retention' : 'Promotion';
    if (record.referendumStatus === 'success') {
      return t('fellowship.profile.activityFeed.referendumSuccess', { type });
    } else {
      return t('fellowship.profile.activityFeed.referendumFailed', { type });
    }
  }
};

type Props = {
  record: FeedEventReferendum;
};

export const ReferendumActivityItem = memo(({ record }: Props) => {
  const { t } = useI18n();
  const input = useUnit(fellowshipProfileFeature.input);

  const title = getTitle(record, t);

  const handleClick = () => {
    if (input?.chainId) {
      const path = generatePath(Paths.FELLOWSHIP_REFERENDUM, {
        chainId: input.chainId,
        referendumId: record.referendumId.toString(),
      });
      navigationModel.events.navigateTo(path);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <FootnoteText className="grow font-bold">{title}</FootnoteText>
      <span className="cursor-pointer font-semibold text-primary-button-background-default" onClick={handleClick}>
        {t('fellowship.profile.activityFeed.viewReferendum')}
      </span>
    </div>
  );
});
