import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText, Markdown, Separator, SmallTitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type OngoingReferendum, type Referendum, trackService } from '@/domains/collectives';
import { evidenceInfo } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { referendums } from '../../model/referendums';
import { tracks } from '../../model/tracks';

import { taskVotingActionSlot } from './OngoingReferendumVoting';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  onReferendumSelect(referendum: Referendum): void;
};

export const PromotionRetentionVoting = ({ referendum, transaction, onReferendumSelect }: Props) => {
  const { t } = useI18n();

  const input = useUnit(fellowshipTasksFeature.input);
  const allTacks = useUnit(tracks.$tracks);
  const evidencePending = useUnit(referendums.$evidencePending);
  const evidences = useUnit(evidenceInfo.$evidences);

  const api = input?.api;
  const track = allTacks.find(t => t.id === referendum.track);

  const proposer = referendum.proposal?.type === 'Evidence' ? referendum.proposal.accountId : null;
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
    <Box direction="row" gap={5} padding={4}>
      <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
        <Box fillContainer gap={3} grow={1}>
          <SmallTitleText>{title}</SmallTitleText>
          {!evidence?.summary && evidencePending && <Skeleton height="2em" width="85%" />}
          <FootnoteText>
            <Markdown>{evidence?.summary ?? ''}</Markdown>
          </FootnoteText>
        </Box>
      </button>
      <Separator vertical />
      <Box verticalAlign="center" horizontalAlign="space-between" shrink={0}>
        <Slot id={taskVotingActionSlot} props={{ referendum, transaction }} />
      </Box>
    </Box>
  );
};
