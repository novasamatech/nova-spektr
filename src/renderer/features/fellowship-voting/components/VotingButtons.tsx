import { useUnit } from 'effector-react';
import { memo, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { VotingButtonWithTooltip } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { type Evidence, type OngoingReferendum, referendumService } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { useFellowshipChain } from '@/aggregates/fellowship-network';
import { Card } from '@/features/fellowship-referendum-details';
import { useCanVoteForReferendum } from '../hooks/useCanVoteForReferendum';
import { useMemberVoteInfo } from '../hooks/useMemberVoteInfo';
import { useProposer } from '../hooks/useProposer';
import { useReferendumVote } from '../hooks/useReferendumVote';
import { voting } from '../model/voting';

import { VotingModal } from './VotingModal';

type Props = {
  referendum: OngoingReferendum | null;
  evidence: Evidence | null;
  onClose?: () => void;
};

export const VotingButtons = memo(({ referendum, evidence, onClose }: Props) => {
  const { t } = useI18n();

  const chain = useFellowshipChain();

  const { data: proposerMember } = useProposer(referendum, evidence);
  const { data: vote } = useReferendumVote(referendum);
  const { data: account } = useFellowshipAccount();

  const { memberVoteWeight, userVotesImpact, hasRequiredRank } = useMemberVoteInfo(referendum);

  const canVote = useCanVoteForReferendum(referendum);

  const [decision, setDecision] = useState<'aye' | 'nay' | null>(null);

  const inBasket = useUnit(voting.$inBasket);

  const isTransactionInBasket = inBasket.aye === true || inBasket.nay === true;

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const title = useMemo(() => {
    if (nullable(chain) || nullable(referendum) || !referendumService.isOngoing(referendum)) return '';

    if (!proposerMember) return '';

    if (referendum.proposal && referendumService.isEvidenceProposal(referendum.proposal)) {
      const rank = referendumService.getRankForReferendum(referendum);
      return rank != null
        ? t('fellowship.tasks.titles.votingTitle.rank', { rank })
        : t('fellowship.tasks.titles.votingTitle.rfcOrWhitelist');
    }

    if (referendum.proposal && referendumService.isSpendProposal(referendum.proposal)) {
      return t('fellowship.tasks.titles.votingTitle.spend');
    }

    return t('fellowship.tasks.titles.votingTitle.rfcOrWhitelist');
  }, [referendum, chain, proposerMember, t]);

  if (nullable(referendum) || nullable(userVotesImpact)) {
    return null;
  }

  const isCanVote = canVote && hasRequiredRank;

  const alreadyVotedNay = nonNullable(vote) && vote.decision === 'Nay';
  const alreadyVotedAye = nonNullable(vote) && vote.decision === 'Aye';

  const handleVote = (vote: 'aye' | 'nay') => {
    const alreadyThatVote = (vote === 'aye' && alreadyVotedAye) || (vote === 'nay' && alreadyVotedNay);

    if (canAddToBasket && isTransactionInBasket && alreadyThatVote) {
      if (nonNullable(referendum)) {
        voting.removeFromBasket(referendum.id);
      }
      onClose?.();
      return;
    }

    if (alreadyThatVote) return;

    if (canAddToBasket && nonNullable(referendum)) {
      voting.saveToBasket({
        referendumId: referendum.id,
        vote,
      });
      onClose?.();
    } else {
      setDecision(vote);
    }
  };

  const setAyeDecision = () => handleVote('aye');
  const setNayDecision = () => handleVote('nay');

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{title}</SmallTitleText>
        <VotingModal
          referendum={referendum}
          isOpen={nonNullable(decision) && !canAddToBasket}
          vote={decision}
          onClose={() => setDecision(null)}
        />

        <Box gap={4}>
          <Box direction="row" gap={4}>
            <div data-testid={TEST_IDS.FELLOWSHIP.VOTE_NAY_BUTTON} className="flex-1">
              <VotingButtonWithTooltip
                variant="negative"
                icon="negative"
                disabled={!isCanVote}
                votes={memberVoteWeight}
                voteImpact={userVotesImpact}
                isVoted={isTransactionInBasket ? inBasket.nay : alreadyVotedNay}
                checked={isTransactionInBasket ? inBasket.nay : alreadyVotedNay}
                fullWidth
                onClick={setNayDecision}
              >
                {t('fellowship.voting.notGood')}
              </VotingButtonWithTooltip>
            </div>

            <div data-testid={TEST_IDS.FELLOWSHIP.VOTE_AYE_BUTTON} className="flex-1">
              <VotingButtonWithTooltip
                variant="positive"
                icon="positive"
                disabled={!isCanVote}
                votes={memberVoteWeight}
                voteImpact={userVotesImpact}
                isVoted={isTransactionInBasket ? inBasket.aye : alreadyVotedAye}
                checked={isTransactionInBasket ? inBasket.aye : alreadyVotedAye}
                fullWidth
                onClick={setAyeDecision}
              >
                {t('fellowship.voting.good')}
              </VotingButtonWithTooltip>
            </div>
          </Box>
          {canVote && !hasRequiredRank ? (
            <FootnoteText className="text-center">{t('fellowship.voting.errors.rankThreshold')}</FootnoteText>
          ) : null}
        </Box>
      </Box>
    </Card>
  );
});
