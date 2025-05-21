import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { type Referendum, referendumService } from '@/domains/collectives';
import { votesModel } from '../model/votes';

export const VotingSummary = ({ referendum }: { referendum: Referendum }) => {
  const { t } = useI18n();

  const votes = useUnit(votesModel.$votesList);
  const pending = useUnit(votesModel.$pending);

  const totalAyes = useMemo(
    () => votes.filter(vote => vote.decision === 'Aye').reduce((acc, v) => acc + v.votes, 0),
    [votes],
  );
  const totalNays = useMemo(
    () => votes.filter(vote => vote.decision === 'Nay').reduce((acc, v) => acc + v.votes, 0),
    [votes],
  );

  const totalVotes = totalAyes + totalNays;
  const nobodyVoted = totalVotes === 0;

  const { levelTextKey, levelClassName } = useMemo(() => {
    const ayePercentage = totalVotes > 0 ? (totalAyes / totalVotes) * 100 : 0;

    if (ayePercentage <= 25) {
      return { levelTextKey: 'fellowship.votingHistory.level.notGood', levelClassName: 'text-text-negative' };
    }
    if (ayePercentage <= 75) {
      return { levelTextKey: 'fellowship.votingHistory.level.controversial', levelClassName: 'text-text-warning' };
    }
    return { levelTextKey: 'fellowship.votingHistory.level.good', levelClassName: 'text-text-positive' };
  }, [totalAyes, totalNays]);

  let title = null;

  if (nobodyVoted) {
    title = t('fellowship.votingHistory.noVotes');
  } else if (referendumService.isCompleted(referendum)) {
    title = t('fellowship.votingHistory.voteEnded');
  } else {
    title = t('fellowship.votingHistory.subtitle');
  }

  let voteLevel = null;

  if (!nobodyVoted) {
    if (pending) {
      voteLevel = <Skeleton width={12} height="1lh" />;
    } else {
      voteLevel = <span className={levelClassName}>{t(levelTextKey)}</span>;
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center">
        <FootnoteText>
          {title} {voteLevel}
        </FootnoteText>
      </div>
    </div>
  );
};
