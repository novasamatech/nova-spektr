import { formatDate } from 'date-fns';
import { useUnit } from 'effector-react';
import { type PropsWithChildren, type ReactNode, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon, TitleText } from '@/shared/ui';
import { Box, Skeleton } from '@/shared/ui-kit';
import {
  type Member,
  type Referendum,
  $ipfsGateways,
  memberService,
  useEvidencesContent,
  votingHistoryService,
} from '@/domains/collectives';
import { useBlock, useBlockTime } from '@/domains/network';
import { useFellowshipMember, useMemberPromotionReferendum } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
import { getPromotionGreenStartBlock } from '@/aggregates/fellowship-promotion';
import { usePromotionEvidence, usePromotionEvidenceSubmissionDate } from '../hooks/usePromotionEvidence';
import { usePromotionPeriod, usePromotionPeriodDates } from '../hooks/usePromotionPeriod';
import { useVotes } from '../hooks/useVotes';
import { PromotionWidgetState, useWidgetState } from '../hooks/useWidgetState';

import { TimelineWithRanks } from './TimelineWithRanks';
import { TimerToBlock } from './TimerToBlock';

export const referendumWidgetActionSlot = createSlot<{ referendum: Referendum }>();
export const evidenceSubmitSlot = createSlot<{
  mode?: 'submit' | 'edit';
  evidenceContent?: string;
}>();

type Props = {
  member: Member;
};

export const PromotionWidget = memo(({ member }: Props) => {
  const { t } = useI18n();
  const { data: state } = useWidgetState();
  const { fromDateFormatted, toDateFormatted, promotionPeriod, timelineValue } = usePromotionData();

  const timelineSteps = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.promotionPeriodTooltip', {
          from: fromDateFormatted,
          to: toDateFormatted,
        }),
        length: 8,
      },
      {
        baseColorClass: cnTw('bg-badge-green-background'),
        filledColorClass: cnTw('bg-text-positive'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.submitAnytime'),
        length: 2,
      },
    ],
    [t, fromDateFormatted, toDateFormatted],
  );

  if (!memberService.canPromote(member)) return null;

  if (state === PromotionWidgetState.WAITING_OPPORTUNITY) {
    return (
      <WidgetContainer
        title={t('fellowship.promotion.waiting.title')}
        description={t('fellowship.promotion.waiting.description', { date: toDateFormatted })}
        footer={
          promotionPeriod && (
            <>
              <TimerToBlock endBlock={promotionPeriod.to} shortDateFormat />
              <FootnoteText className="text-text-primary">
                {t('fellowship.promotion.waiting.untilOpportunity')}
              </FootnoteText>
            </>
          )
        }
      >
        <TimelineWithRanks currentRank={member.rank} steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === PromotionWidgetState.EVIDENCE_CAN_BE_SUBMITTED) {
    return (
      <WidgetContainer
        title={t('fellowship.promotion.canSubmit.title')}
        description={t('fellowship.promotion.canSubmit.description')}
        footer={
          <>
            <Icon name="clock" size={16} className="mr-1 text-chip-icon" />
            <FootnoteText>{t('fellowship.promotion.canSubmit.submitAnytime')}</FootnoteText>
            <div className="ml-auto">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <TimelineWithRanks currentRank={member.rank} steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === PromotionWidgetState.EVIDENCE_SUBMITTED) {
    return <EvidenceSubmitted />;
  }

  if (state === PromotionWidgetState.REFERENDUM_CREATED) {
    return <ReferendumCreated />;
  }

  return null;
});

export const EvidenceSubmitted = memo(() => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const { data: promotionEvidenceSubmissionDate } = usePromotionEvidenceSubmissionDate();
  const { data: promotionEvidence } = usePromotionEvidence();
  const { fromDateFormatted, toDateFormatted, promotionPeriodDates, timelineValue, member } = usePromotionData();

  const gateways = useUnit($ipfsGateways);

  const { data: evidenceContent } = useEvidencesContent({
    palletType: 'fellowship',
    chainId: chain?.chainId,
    evidenceHash: promotionEvidence?.hash,
    gateways,
  });

  const submissionDateFormatted = promotionEvidenceSubmissionDate
    ? formatDate(promotionEvidenceSubmissionDate, 'dd.MM.yy')
    : '';

  const timelineSteps = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.promotion.canSubmit.promotionPeriodTooltip', {
          from: fromDateFormatted,
          to: toDateFormatted,
        }),
        length: 10,
      },
    ],
    [t, fromDateFormatted, toDateFormatted],
  );

  const evidenceSubmissionPosition = useMemo(() => {
    if (
      nullable(promotionEvidenceSubmissionDate) ||
      nullable(promotionPeriodDates) ||
      nullable(promotionPeriodDates.from) ||
      nullable(promotionPeriodDates.to)
    )
      return 50;

    const submissionTime = new Date(promotionEvidenceSubmissionDate).getTime();
    const fromTime = promotionPeriodDates.from;
    const toTime = promotionPeriodDates.to;
    const position = ((submissionTime - fromTime) / (toTime - fromTime)) * 100;

    return Math.max(10, Math.min(90, position));
  }, [promotionEvidenceSubmissionDate, promotionPeriodDates]);

  if (!member) return null;

  return (
    <WidgetContainer
      title={t('fellowship.promotion.submitted.title')}
      description={t('fellowship.promotion.submitted.description')}
      footer={
        <>
          <Icon name="clock" size={16} className="mr-1 text-chip-icon" />
          <FootnoteText>{t('fellowship.promotion.submitted.ensureAwareness')}</FootnoteText>
          <div className="ml-auto flex gap-2">
            <Slot
              id={evidenceSubmitSlot}
              props={{ mode: 'edit' as const, evidenceContent: evidenceContent?.content }}
            />
          </div>
        </>
      }
    >
      <TimelineWithRanks
        currentRank={member.rank}
        steps={timelineSteps}
        value={timelineValue}
        submissionPosition={evidenceSubmissionPosition}
        submissionDate={submissionDateFormatted}
      />
    </WidgetContainer>
  );
});

const ReferendumCreated = memo(() => {
  const { t } = useI18n();

  const { data: referendum } = useMemberPromotionReferendum();
  const { data: votes, pending } = useVotes();

  const votingRating = useMemo(() => {
    return votingHistoryService.getApprovalRating(votes);
  }, [votes]);

  const nobodyVoted = nullable(votingRating);

  const { levelTextKey, levelClassName } = useMemo(() => {
    if (votingRating === 'NotGood') {
      return { levelTextKey: 'fellowship.votingHistory.level.notGood', levelClassName: 'text-text-negative' };
    }
    if (votingRating === 'Controversial') {
      return { levelTextKey: 'fellowship.votingHistory.level.controversial', levelClassName: 'text-text-warning' };
    }
    return { levelTextKey: 'fellowship.votingHistory.level.good', levelClassName: 'text-text-positive' };
  }, [votingRating]);

  const title = nobodyVoted
    ? t('fellowship.votingHistory.noVotes')
    : t('fellowship.votingHistory.subtitlePromotionRetention');

  const voteLevel =
    !nobodyVoted &&
    (pending ? <Skeleton width={12} height="1lh" /> : <span className={levelClassName}>{t(levelTextKey)}</span>);

  if (!referendum) return null;

  return (
    <WidgetContainer
      title={t('fellowship.promotion.referendumCreated.title')}
      footer={
        <>
          <TimerToBlock endBlock={referendum.ends} shortDateFormat />
          <FootnoteText className="text-text-primary">
            {t('fellowship.promotion.referendumCreated.description')}
          </FootnoteText>
          <Slot id={referendumWidgetActionSlot} props={{ referendum }} />
        </>
      }
    >
      <FootnoteText>
        {title} {voteLevel}
      </FootnoteText>
    </WidgetContainer>
  );
});

const usePromotionData = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: promotionPeriodDates } = usePromotionPeriodDates();
  const { data: promotionPeriod } = usePromotionPeriod();
  const { data: currentBlock } = useBlock(api);
  const { data: blockTime } = useBlockTime(api, chain);
  const { data: member } = useFellowshipMember();

  const fromDateFormatted =
    nonNullable(promotionPeriodDates) && nonNullable(promotionPeriodDates.from)
      ? formatDate(promotionPeriodDates.from, 'dd.MM.yy')
      : null;
  const toDateFormatted =
    nonNullable(promotionPeriodDates) && nonNullable(promotionPeriodDates.to)
      ? formatDate(promotionPeriodDates.to, 'dd.MM.yy')
      : null;

  const timelineValue = useMemo(() => {
    if (nullable(promotionPeriod) || nullable(currentBlock) || nullable(blockTime)) return 0;

    const blockTimeMs = blockTime.toNumber();
    if (!Number.isFinite(blockTimeMs) || blockTimeMs <= 0) return 0;

    const from = Number(promotionPeriod.from);
    const to = Number(promotionPeriod.to);
    const now = Number(currentBlock);

    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;

    const greenStart = getPromotionGreenStartBlock(from, to, blockTimeMs);

    const clampedNow = Math.min(Math.max(now, from), to);

    const firstSegment = Math.max(0, greenStart - from);
    const secondSegment = Math.max(1, to - greenStart);

    if (firstSegment === 0) {
      const progress = (clampedNow - from) / secondSegment;
      return Math.min(10, 8 + progress * 2);
    }

    if (clampedNow <= greenStart) {
      const progress = (clampedNow - from) / firstSegment;
      return Math.min(8, Math.max(0, progress * 8));
    }

    const progress = (clampedNow - greenStart) / secondSegment;
    return Math.min(10, 8 + progress * 2);
  }, [promotionPeriod, currentBlock, blockTime]);

  return {
    promotionPeriod,
    currentBlock,
    fromDateFormatted,
    toDateFormatted,
    promotionPeriodDates,
    timelineValue,
    member,
  };
};

type WidgetContainerProps = PropsWithChildren<{
  title: string;
  footer: ReactNode;
  description?: string;
}>;

const WidgetContainer = ({ title, description, children, footer }: WidgetContainerProps) => {
  const { t } = useI18n();

  return (
    <Box gap={2}>
      <CaptionText>{t('fellowship.promotion.title')}</CaptionText>
      <div className="rounded-lg bg-block-background-default p-4">
        <Box gap={4}>
          <Box gap={3}>
            <Box gap={1}>
              <Box direction="row" gap={2} verticalAlign="center">
                <TitleText className="text-medium-title font-extrabold text-text-primary">{title}</TitleText>
              </Box>
              {description && <FootnoteText className="text-text-primary">{description}</FootnoteText>}
            </Box>
            {children}
          </Box>
          {footer && (
            <Box width="100%" direction="row" verticalAlign="center">
              {footer}
            </Box>
          )}
        </Box>
      </div>
    </Box>
  );
};
