import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Duration, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identityModel } from '../model/identity';
import { activityFeed } from '../model/list';

function getMessage(t: TFunction, record: FeedRecord) {
  switch (record.type) {
    case 'activeChanged':
      return t('fellowship.activityFeed.record.activeChanged', { status: record.isActive ? 'active' : 'inactive' });
    case 'promoted':
      return t('fellowship.activityFeed.record.promoted', { rank: record.rank });
    case 'demoted':
      return t('fellowship.activityFeed.record.demoted', { rank: record.rank });
    case 'proven':
      return t('fellowship.activityFeed.record.proven', { rank: record.rank });
    case 'imported':
      return t('fellowship.activityFeed.record.imported', { rank: record.rank });
    case 'requested':
      return record.wish === 'Promotion'
        ? t('fellowship.activityFeed.record.submittedPromotion')
        : t('fellowship.activityFeed.record.submittedRetention');

    default:
      return `Unknown action: ${record.type}`;
  }
}

const ActivityPlaceholder = () => {
  return (
    <div className="flex flex-col gap-1 px-5">
      <div className="flex items-center gap-4 text-button-small">
        <div className="flex min-w-0 grow items-center py-1.5">
          <Box direction="row" verticalAlign="center" gap={2}>
            <Icon name="emptyIdenticon" size={20} />
            <Skeleton width="10ch" height="1em" />
          </Box>
        </div>
        <HelpText className="h-fit">
          <Skeleton height="1em" width="5ch" />
        </HelpText>
      </div>
      <FootnoteText>
        <Skeleton width="100%" height="1lh" />
      </FootnoteText>
    </div>
  );
};

export const ActivityList = memo(() => {
  const { t } = useI18n();
  const feed = useUnit(activityFeed.$activityFeed);
  const input = useUnit(fellowshipActivityFeedFeature.input);
  const identities = useUnit(identityModel.$list);

  const { list, isLoading } = useDeferredList({ list: feed, isLoading: feed.length === 0 });

  const now = Date.now();

  return (
    <div className="flex flex-col gap-3 pb-3">
      {isLoading || nullable(input) ? Array.from({ length: 5 }).map((_, i) => <ActivityPlaceholder key={i} />) : null}
      {list.map(record => {
        const identity = identities[record.accountId];

        return (
          <div key={`${record.block}-${record.accountId}-${record.type}`} className="flex flex-col gap-1 px-5">
            <div className="flex items-center gap-4 py-1.5 text-button-small">
              <div className="min-w-0 grow">
                {nonNullable(input?.chain) && (
                  <Account
                    title={identity?.name}
                    hideAddress
                    iconSize={20}
                    variant="short"
                    accountId={record.accountId}
                    chain={input.chain}
                  />
                )}
              </div>
              <HelpText className="max-w-[40%] shrink-0 text-end text-text-secondary">
                <Duration seconds={(now - record.at.getTime()) / 1000} />
              </HelpText>
            </div>
            <FootnoteText className="text-text-secondary">{getMessage(t, record)}</FootnoteText>
          </div>
        );
      })}
    </div>
  );
});
