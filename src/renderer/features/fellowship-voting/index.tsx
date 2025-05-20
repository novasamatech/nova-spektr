import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { referendumService, track, trackService } from '@/domains/collectives';
import {
  Card,
  referendumActionsSlot,
  referendumAdditionalHighPriorityInfoSlot,
} from '@/features/fellowship-referendum-details';
import { referendumVotingTaskActionSlot } from '@/features/fellowship-tasks';

import { ReferendumEndTimer } from './components/ReferendumEndTimer';
import { VotingActions } from './components/VotingActions';
import { VotingButtons } from './components/VotingButtons';
import { VotingConfirmation } from './components/VotingConfirmation';
import { WalletVotingInfo } from './components/WalletVotingInfo';
import { fellowshipVotingFeature } from './model/feature';
import { fellowship } from './model/fellowship';
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

fellowshipVotingFeature.inject(referendumAdditionalHighPriorityInfoSlot, ({ referendumId }) => {
  return <WalletVotingInfo referendumId={referendumId} />;
});

fellowshipVotingFeature.inject(referendumActionsSlot, ({ evidence, referendum }) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipVotingFeature.input);
  const tracks = useUnit(track.$list);

  const title = useMemo(() => {
    if (!referendum || !referendumService.isOngoing(referendum)) return '';

    const isRFCProposal = referendum.proposal ? referendumService.isRfcProposal(referendum.proposal) : false;

    const relatedTrack = input ? tracks.fellowship?.[input.chainId] : null;
    const currentTrack = relatedTrack?.find(t => t.id === referendum.track);

    if (!currentTrack) return '';

    let title = '';
    title = t('fellowship.tasks.titles.votingTitle.rank', { rank: trackService.getDanFromTrackName(currentTrack) });

    if (isRFCProposal) {
      title = t('fellowship.tasks.titles.votingTitle.rfc');
    }

    //todo detect whitelist
    // if (isWhitelist) {
    //   title = t('fellowship.tasks.titles.votingTitle.whitelist');
    // }

    return title;
  }, [referendum, input, tracks]);

  return (
    <Card>
      <Box padding={6} gap={6}>
        <SmallTitleText>{title}</SmallTitleText>
        <VotingButtons referendum={referendum} evidence={evidence} />
      </Box>
    </Card>
  );
});
