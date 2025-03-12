import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button, Markdown, TitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, evidenceService, trackService } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { referendums } from '../../model/referendums';
import { tracks } from '../../model/tracks';

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
  const allTacks = useUnit(tracks.$tracks);
  const evidencePending = useUnit(referendums.$evidencePending);
  const evidences = useUnit(evidenceInfo.$evidences);

  const api = input?.api;
  const track = allTacks.find(t => t.id === referendum.track);

  const proposer =
    nonNullable(api) && referendum.proposal.type === 'Inline'
      ? evidenceService.getProposalAccount(api, referendum.proposal.data)
      : null;

  const evidence = evidences.find(e => e.accountId === proposer);

  useEffect(() => {
    if (proposer) {
      referendums.requestEvidence(proposer);
    }
  }, [proposer]);

  if (nullable(track) || nullable(api)) return null;

  const isRetentionTrack = trackService.isRetentionTrack(track.id);
  const isPromotionTrack = trackService.isPromotionTrack(track.id);

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
      {!evidence?.summary && evidencePending && <Skeleton height="5em" width="85%" />}
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
