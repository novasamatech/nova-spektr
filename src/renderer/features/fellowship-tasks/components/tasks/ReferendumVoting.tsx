import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button, Markdown, TitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, evidenceService, tracksService } from '@/domains/collectives';
import { fellowshipTasksFeature } from '../../model/feature';
import { referendumList } from '../../model/referendums';

export const taskVotingActionSlot = createSlot<{ referendumId: ReferendumId }>();
export const taskVotingDetailsActionSlot = createSlot<{ referendumId: ReferendumId }>();

type Props = {
  referendum: OngoingReferendum;
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const ReferendumVoting = ({ referendum, canSkip, onSkip }: Props) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipTasksFeature.input);
  const tracks = useUnit(referendumList.$tracks);
  const evidences = useUnit(referendumList.$evidences);

  const api = input?.api;
  const track = tracks.find(t => t.id === referendum.track);
  if (nullable(track) || nullable(api)) return null;

  const proposer =
    referendum.proposal.type === 'Inline' ? evidenceService.getProposalAccount(api, referendum.proposal.data) : null;

  const evidence = evidences.find(e => e.accountId === proposer);

  useEffect(() => {
    if (proposer) {
      referendumList.requestEvidence(proposer);
    }
  }, [proposer]);

  const isRetentionTrack = tracksService.isRetentionTrack(track.id);
  const isPromotionTrack = tracksService.isPromotionTrack(track.id);

  let title = t('fellowship.tasks.task.anyReferendum.title');

  if (isRetentionTrack) {
    title = t('fellowship.tasks.task.retentionVoting.title');
  }
  if (isPromotionTrack) {
    title = t('fellowship.tasks.task.promotionVoting.title');
  }

  return (
    <Box fillContainer padding={5} gap={5}>
      <TitleText>{title}</TitleText>
      <Markdown>{evidence?.summary ?? ''}</Markdown>
      <Slot id={taskVotingDetailsActionSlot} props={{ referendumId: referendum.id }} />
      <Box grow={1} />
      <Box direction="row-reverse" verticalAlign="center" horizontalAlign="space-between">
        <Slot id={taskVotingActionSlot} props={{ referendumId: referendum.id }} />
        {canSkip && (
          <Button variant="text" onClick={onSkip}>
            {t('fellowship.tasks.skip')}
          </Button>
        )}
      </Box>
    </Box>
  );
};
