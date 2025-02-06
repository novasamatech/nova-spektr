import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button, TitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, evidenceService, tracksService } from '@/domains/collectives';
import { fellowshipReferendumDetailsFeature } from '@/features/fellowship-referendum-details';
import { fellowshipTasksFeature } from '../../model/feature';
import { referendumList } from '../../model/referendums';

const {
  views: { ReferendumDetailsModal },
} = fellowshipReferendumDetailsFeature;

export const taskVotingActionSlot = createSlot<{ referendumId: ReferendumId }>();

type Props = {
  referendum: OngoingReferendum;
  canSkip: boolean;
  onSkip: VoidFunction;
};

export const ReferendumVoting = ({ referendum, canSkip, onSkip }: Props) => {
  const { t } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const input = useUnit(fellowshipTasksFeature.input);
  const tracks = useUnit(referendumList.$tracks);

  const api = input?.api;
  const track = tracks.find(t => t.id === referendum.track);
  if (nullable(track) || nullable(api)) return null;

  const proposer =
    referendum.proposal.type === 'Inline' ? evidenceService.getProposalAccount(api, referendum.proposal.data) : null;

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
    <>
      <Box fillContainer padding={5} gap={5}>
        <TitleText>{title}</TitleText>
        <span className="flex whitespace-pre text-button-large">
          <Trans
            t={t}
            i18nKey="fellowship.tasks.task.anyReferendum.viewEvidence"
            components={{
              a: <Button variant="text" className="inline-flex h-auto p-0" onClick={() => setDetailsOpen(true)} />,
            }}
          />
        </span>
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

      <ReferendumDetailsModal referendumId={referendum.id} isOpen={detailsOpen} onToggle={setDetailsOpen} />
    </>
  );
};
