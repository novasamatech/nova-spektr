import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { referendumService, track, trackService } from '@/domains/collectives';
import { Card, referendumActionsSlot } from '@/features/fellowship-referendum-details';
import { referendumVotingTaskActionSlot } from '@/features/fellowship-tasks';

import { ReferendumEndTimer } from './components/ReferendumEndTimer';
import { VotingActions } from './components/VotingActions';
import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
import { members } from './model/members';
import { votingStatus } from './model/votingStatus';

export { fellowshipVotingFeature, VotingConfirmation, votingStatus, fellowship };

fellowshipVotingFeature.inject(referendumVotingTaskActionSlot, ({ referendum, transaction, dateThresholds }) => {
  return (
    <>
      <ReferendumEndTimer endBlock={referendum.ends} dateThresholds={dateThresholds} shortDateFormat />
      <VotingActions referendum={referendum} transaction={transaction} />
    </>
  );
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ evidence, referendum }) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipVotingFeature.input);
  const tracks = useUnit(track.$list);

  const proposerMember = useStoreMap({
    store: members.$list,
    keys: [referendum, evidence],
    fn: (members, [referendum, evidence]) => {
      if (nonNullable(referendum) && referendumService.isOngoing(referendum)) {
        const proposer = referendumService.getProposer(referendum);
        return members.find(m => m.accountId === proposer) ?? null;
      }

      if (nonNullable(evidence)) {
        return members.find(m => m.accountId === evidence?.accountId) ?? null;
      }

      return null;
    },
  });

  const title = useMemo(() => {
    if (!referendum || !referendumService.isOngoing(referendum)) return '';

    const isRFCProposal = referendum.proposal ? referendumService.isRfcProposal(referendum.proposal) : false;

    const relatedTracks = input ? tracks.fellowship?.[input.chainId] : null;
    const isPromotion = evidence?.wish === 'Promotion' || trackService.isPromotionTrack(referendum.track);

    if (!relatedTracks || !proposerMember) return '';

    const trackName = isPromotion ? 'Promotion' : 'Retention';

    if (isRFCProposal) {
      return t('fellowship.tasks.titles.votingTitle.rfc');
    }

    //todo detect whitelist
    // if (isWhitelist) {
    // return t('fellowship.tasks.titles.votingTitle.whitelist');
    // }

    return t('fellowship.tasks.titles.votingTitle.rank', {
      rank: trackService.getProposalTrack(relatedTracks, proposerMember, trackName),
    });
  }, [referendum, input, tracks]);

  if (nonNullable(referendum) && referendumService.isCompleted(referendum)) {
    return null;
  }

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{title}</SmallTitleText>
        <VotingButtons referendum={referendum} evidence={evidence} />
      </Box>
    </Card>
  );
});
