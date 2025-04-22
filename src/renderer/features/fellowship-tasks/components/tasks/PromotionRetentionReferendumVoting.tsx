import { useStoreMap, useUnit } from 'effector-react';
import { memo } from 'react';

import { type Transaction } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { nonNullable, toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant, Skeleton } from '@/shared/ui-kit';
import {
  type OngoingReferendum,
  type Referendum,
  type Track,
  referendumService,
  track,
  trackService,
} from '@/domains/collectives';
import { evidenceModel } from '../../model/evidence';
import { fellowshipTasksFeature } from '../../model/feature';
import { members } from '../../model/members';
import { votes } from '../../model/voting';
import { VoteBadge } from '../VoteBadge/VoteBadge';

import { referendumVotingTaskActionSlot } from './OngoingReferendumVoting';

const tagLabels: Record<string, { text: string; color: LabelVariant }> = {
  urgent: {
    text: 'fellowship.tasks.labels.urgent',
    color: 'red',
  },
  controversial: {
    text: 'fellowship.tasks.labels.controversial',
    color: 'blue',
  },
  importantVote: {
    text: 'fellowship.tasks.labels.importantVote',
    color: 'purple',
  },
};

const getRankTitle = (rank: number, relatedTrack: Track[] | null | undefined) =>
  toRomanNumeral(rank) + ' ' + relatedTrack?.find(t => t.id === rank)?.name || '';

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
  onReferendumSelect(referendum: Referendum): void;
};

export const PromotionRetentionReferendumVoting = memo(
  ({ referendum, tags, transaction, onReferendumSelect }: Props) => {
    const { t } = useI18n();

    const input = useUnit(fellowshipTasksFeature.input);
    const evidenceSummaryPending = useUnit(evidenceModel.requestEvidenceSummary.pending);
    const evidenceSummaryPopulated = useUnit(evidenceModel.$summaryPopulated);
    const evidenceSummaries = useUnit(evidenceModel.$evidencesSummary);
    const tracks = useUnit(track.$list);
    const vote = useStoreMap({
      store: votes.$memberVotes,
      keys: [referendum.id],
      fn: (votes, [id]) => votes.find(v => v.referendumId === id) ?? null,
    });

    const voted = nonNullable(vote);
    const pending = evidenceSummaryPending || !evidenceSummaryPopulated;
    const proposerAccountId = referendumService.getProposer(referendum);
    const evidenceSummary = evidenceSummaries.find(e => e.accountId === proposerAccountId);
    const member = useStoreMap({
      store: members.$list,
      keys: [evidenceSummary?.accountId],
      fn: (list, [accountId]) => list.find(m => m.accountId === accountId) ?? null,
    });

    const firstTag = tags.at(0);
    const labelConfig = firstTag ? tagLabels[firstTag] : null;

    const isPromotionTrack = trackService.isPromotionTrack(referendum.track);

    const relatedTrack = input ? tracks.fellowship?.[input.chainId] : null;

    const title = isPromotionTrack
      ? t('fellowship.tasks.task.referendum.promotionTitle', {
          rank: member ? getRankTitle(member.rank + 1, relatedTrack) : '',
        })
      : t('fellowship.tasks.task.referendum.retentionTitle', {
          rank: member ? getRankTitle(member.rank, relatedTrack) : '',
        });

    return (
      <Box direction="row" gap={10} padding={4}>
        <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
          <Box fillContainer gap={3} grow={1}>
            <Box direction="row" gap={3}>
              {labelConfig ? <Label variant={labelConfig.color}>{t(labelConfig.text)}</Label> : null}
              <SmallTitleText className="truncate">{title}</SmallTitleText>
              {voted && <VoteBadge active />}
            </Box>
            {!evidenceSummary?.summary && <Skeleton height="3lh" width="85%" />}
            <FootnoteText as="div">
              {evidenceSummary?.summary ? <Markdown>{evidenceSummary?.summary}</Markdown> : null}
              {!evidenceSummary?.summary && !pending ? t('fellowship.tasks.task.promotionVoting.noEvidence') : null}
            </FootnoteText>
          </Box>
        </button>
        <Box alignSelf="flex-end" gap={3} horizontalAlign="end" shrink={0}>
          <Slot id={referendumVotingTaskActionSlot} props={{ referendum, transaction }} />
        </Box>
      </Box>
    );
  },
);
