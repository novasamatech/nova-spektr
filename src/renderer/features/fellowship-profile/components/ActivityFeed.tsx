import { useUnit } from 'effector-react';
import { type TFunction } from 'i18next';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { Duration, FootnoteText, HelpText } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type FeedRecord } from '@/domains/collectives';
import { activity } from '../model/activity';

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

export const ActivityFeed = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const list = useUnit(activity.$list);
  const now = Date.now();

  return (
    <Modal size="md" height="lg">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.profile.activity')}</Modal.Title>
      <Modal.Content>
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
      </Modal.Content>
    </Modal>
  );
};
