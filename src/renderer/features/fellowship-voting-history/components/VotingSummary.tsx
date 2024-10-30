import { useUnit } from 'effector-react';
import orderBy from 'lodash/orderBy';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { votesModel } from '../model/votes';

export const VotingSummary = () => {
  const { t } = useI18n();

  const votes = useUnit(votesModel.$votesList);
  const pending = useUnit(votesModel.$pending);

  const ayes = orderBy(
    votes.filter(vote => vote.decision === 'Aye'),
    'votes',
    'desc',
  );

  const nays = orderBy(
    votes.filter(vote => vote.decision === 'Nay'),
    'votes',
    'desc',
  );

  return (
    <div className="flex flex-col items-start gap-3">
      <Skeleton active={pending} fullWidth>
        <div className="flex w-full items-center gap-2">
          <div className="h-3 w-1 rounded-[0.25em] bg-icon-positive" />
          <FootnoteText>{t('governance.referendum.aye')}</FootnoteText>
          <FootnoteText className="grow text-end">
            {t('fellowship.votingHistory.votes', { count: ayes.length })}
          </FootnoteText>
        </div>
      </Skeleton>
      <Skeleton active={pending} fullWidth>
        <div className="flex w-full items-center gap-2">
          <div className="h-3 w-1 rounded-[4px] bg-icon-negative" />
          <FootnoteText>{t('governance.referendum.nay')}</FootnoteText>
          <FootnoteText className="grow text-end">
            {t('fellowship.votingHistory.votes', { count: nays.length })}
          </FootnoteText>
        </div>
      </Skeleton>
    </div>
  );
};
