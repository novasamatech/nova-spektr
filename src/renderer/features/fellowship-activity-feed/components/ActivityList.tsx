import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { type FeedRecord } from '@/domains/collectives';
import { fellowshipActivityFeedFeature } from '../model/feature';
import { identity } from '../model/identity';
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

export const ActivityList = memo(() => {
  const { t } = useI18n();
  const feed = useUnit(activityFeed.$activityFeed);
  const input = useUnit(fellowshipActivityFeedFeature.input);
  const identities = useUnit(identity.$list);

  if (nullable(input)) return null;

  const now = Date.now();

  return (
    <div className="flex flex-col gap-3">
      {feed.map(record => {
        const identity = identities[record.accountId];

        return (
          <div key={`${record.block}-${record.accountId}-${record.type}`} className="flex flex-col gap-1 px-5 pb-3">
            <div className="flex gap-4 text-button-small">
              <div className="min-w-0 grow">
                <Account
                  title={identity?.name}
                  hideAddress
                  iconSize={20}
                  variant="short"
                  accountId={record.accountId}
                  chain={input.chain}
                />
              </div>
              <HelpText className="max-w-[50%] shrink-0 text-text-secondary">
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
