import { type TFunction } from 'i18next';

import { useI18n } from '@/shared/i18n';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Box, ScrollArea, Skeleton } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { useDeferredList } from '../../../shared/lib/hooks';
import { useClock } from '../hooks/useClock';
import { useMemberFeed } from '../hooks/useMemberFeed';

const getMessage = (t: TFunction, record: FeedRecord) => {
  if (record.type === 'activeChanged') {
    return record.isActive
      ? t('fellowship.profile.activityFeed.activeTrue')
      : t('fellowship.profile.activityFeed.activeFalse');
  }

  if (record.type === 'imported') {
    return t('fellowship.profile.activityFeed.imported', { rank: record.rank });
  }

  if (record.type === 'promoted') {
    return t('fellowship.profile.activityFeed.promoted', { rank: record.rank });
  }

  if (record.type === 'demoted') {
    return t('fellowship.profile.activityFeed.demoted', { rank: record.rank });
  }

  if (record.type === 'proven') {
    return t('fellowship.profile.activityFeed.proven', { rank: record.rank });
  }

  if (record.type === 'paid') {
    return t('fellowship.profile.activityFeed.paid');
  }

  if (record.type === 'requested') {
    return record.wish == 'Promotion'
      ? t('fellowship.profile.activityFeed.requestedPromotion')
      : t('fellowship.profile.activityFeed.requestedRetention');
  }

  return '';
};

export const ActivityFeed = () => {
  const { t } = useI18n();
  const now = useClock(60_000);
  const { data, pending } = useMemberFeed();

  const { list, isLoading } = useDeferredList({ list: data, isLoading: pending });

  return (
    <Box>
      <Box direction="row" padding={[5.5, 5]} gap={2}>
        <span className="text-caption text-text-secondary uppercase">{t('fellowship.profile.activity')}</span>
        <Skeleton active={!isLoading}>
          <span className="text-caption text-text-tertiary uppercase">{list.length}</span>
        </Skeleton>
      </Box>
      <ScrollArea>
        <Box padding={[0, 3, 5]} gap={6}>
          {list.map(x => (
            <div key={`${x.type}-${x.block}`} className="flex px-2">
              <FootnoteText className="grow items-center">{getMessage(t, x)}</FootnoteText>
              <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
                <Duration seconds={(now - x.at.getTime()) / 1000} />
              </HelpText>
            </div>
          ))}
        </Box>
      </ScrollArea>
    </Box>
  );
};
