import { differenceInMilliseconds, formatDate, subDays } from 'date-fns';
import { type PropsWithChildren, type ReactNode, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, getExpectedBlockTime, nonNullable, nullable } from '@/shared/lib/utils';
import { CaptionText, FootnoteText, Icon, TitleText } from '@/shared/ui';
import { Box, Skeleton, type TimelineStep } from '@/shared/ui-kit';
import {
  type Member,
  type Referendum,
  memberService,
  useEvidencesContent,
  votingHistoryService,
} from '@/domains/collectives';
import { useFellowshipMemberEvidence, useMemberRetentionReferendum } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';
import {
  DANGER_THRESHOLD_DAYS,
  MS_PER_DAY,
  RetentionWidgetState,
  WARNING_THRESHOLD_DAYS,
  useRetentionPeriod,
  useRetentionPeriodDates,
  useRetentionWidgetState,
} from '@/aggregates/fellowship-retention';
import { useRetentionEvidenceSubmissionDate } from '../hooks/useRetentionEvidenceSubmissionDate';
import { useVotes } from '../hooks/useVotes';

import { RetentionTimeline } from './RetentionTimeline';
import { TimerToBlock } from './TimerToBlock';

/**
 * Timeline length constants in percentages. Total visual width is distributed
 * across retention period zones
 */
const SAFE_ZONE_LENGTH = 78.5;
const WARNING_ZONE_LENGTH = 17;
const DANGER_ZONE_LENGTH = 4.5;
const TOTAL_LENGTH = SAFE_ZONE_LENGTH + WARNING_ZONE_LENGTH + DANGER_ZONE_LENGTH;

export const referendumWidgetActionSlot = createSlot<{ referendum: Referendum }>();
export const evidenceSubmitSlot = createSlot<{ mode?: 'submit' | 'edit'; evidenceContent?: string }>();

type Props = {
  member: Member;
};

const SkeletonLoader = () => <Skeleton width="100%" height="132px" />;

export const RetentionWidget = memo(({ member }: Props) => {
  const { t } = useI18n();
  const { data: state, pending } = useRetentionWidgetState();
  const { fromDateFormatted, toDateFormatted, retentionPeriod, timelineSteps, timelineValue } = useRetentionData();

  if (!memberService.shouldProve(member)) return null;

  if (!retentionPeriod || pending) return <SkeletonLoader />;

  if (state === RetentionWidgetState.WAITING) {
    return (
      <WidgetContainer
        title={t('fellowship.retention.normal.title')}
        description={t('fellowship.retention.normal.description', {
          from: fromDateFormatted,
          to: toDateFormatted,
        })}
        footer={
          <>
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat />
            <FootnoteText className="shrink-0 text-text-primary">
              {t('fellowship.retention.timer.untilEnd')}
            </FootnoteText>
            <div className="ml-auto">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.WARNING_APPROACHING) {
    return (
      <WidgetContainer
        title={t('fellowship.retention.normal.title')}
        description={t('fellowship.retention.normal.description', {
          from: fromDateFormatted,
          to: toDateFormatted,
        })}
        footer={
          <>
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat icon="hourglass" variant="warning" />
            <FootnoteText className="shrink-0 text-text-primary">
              {t('fellowship.retention.timer.untilEnd')}
            </FootnoteText>
            <div className="ml-auto shrink-0">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.WARNING_URGENT) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.warningUrgent.title')}
        description={t('fellowship.retention.warningUrgent.description', { to: toDateFormatted })}
        footer={
          <>
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat icon="fire" variant="urgent" />
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
            <div className="ml-auto">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.CRITICAL_LAST_CALL) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.criticalLastCall.title')}
        description={t('fellowship.retention.criticalLastCall.description', { to: toDateFormatted })}
        footer={
          <>
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat icon="fire" variant="urgent" />
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
            <div className="ml-auto">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.CRITICAL_EXPIRED) {
    return (
      <WidgetContainer
        icon={<Icon name="warn" size={16} className="text-icon-warning" />}
        title={t('fellowship.retention.criticalExpired.title')}
        description={t('fellowship.retention.criticalExpired.description')}
        footer={
          <>
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat icon="fire" variant="urgent" hideIconText />
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.riskBumped')}</FootnoteText>
            <div className="ml-auto">
              <Slot id={evidenceSubmitSlot} props={{ mode: 'submit' }} />
            </div>
          </>
        }
      >
        <RetentionTimeline steps={timelineSteps} value={timelineValue} />
      </WidgetContainer>
    );
  }

  if (state === RetentionWidgetState.REPORT_SUBMITTED) {
    return <ReportSubmitted />;
  }

  if (state === RetentionWidgetState.REFERENDUM_CREATED) {
    return <ReferendumCreated />;
  }

  return <SkeletonLoader />;
});

const ReportSubmitted = memo(() => {
  const { t } = useI18n();

  const chain = useFellowshipChain();
  const { retentionPeriodDates, timelineValue } = useRetentionData();
  const { data: retentionEvidenceSubmissionDate } = useRetentionEvidenceSubmissionDate();
  const { data: evidence } = useFellowshipMemberEvidence();

  const retentionEvidence = nonNullable(evidence) && evidence.wish === 'Retention' ? evidence : null;

  const { data: evidenceContent } = useEvidencesContent({
    palletType: 'fellowship',
    chainId: chain?.chainId,
    evidenceHash: retentionEvidence?.hash,
  });

  const submissionDate = useMemo(
    () => (retentionEvidenceSubmissionDate ? formatDate(retentionEvidenceSubmissionDate, 'dd.MM.yy') : '—'),
    [retentionEvidenceSubmissionDate],
  );

  const submittedTimelineSteps: TimelineStep[] = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-accent-background'),
        filledColorClass: cnTw('bg-icon-blue-line'),
        onHoverTooltipText: t('fellowship.retention.timeline.submittedOn', { submissionDate }),
        length: TOTAL_LENGTH,
      },
    ],
    [t],
  );

  const submissionPosition = useMemo(() => {
    if (
      nullable(retentionEvidenceSubmissionDate) ||
      nullable(retentionPeriodDates) ||
      nullable(retentionPeriodDates.from) ||
      nullable(retentionPeriodDates.to)
    )
      return 50;

    const submissionDate = new Date(retentionEvidenceSubmissionDate);
    const totalDuration = differenceInMilliseconds(retentionPeriodDates.to, retentionPeriodDates.from);
    const elapsed = differenceInMilliseconds(submissionDate, retentionPeriodDates.from);
    const position = (elapsed / totalDuration) * 100;

    return Math.max(10, Math.min(90, position));
  }, [retentionEvidenceSubmissionDate, retentionPeriodDates]);

  const submissionTooltip = useMemo(() => {
    if (!submissionDate) return undefined;
    return t('fellowship.retention.timeline.submittedOn', { submissionDate });
  }, [retentionEvidenceSubmissionDate, t]);

  return (
    <WidgetContainer
      icon={<Icon name="checkmarkOutline" size={16} className="text-text-positive" />}
      title={t('fellowship.retention.submitted.title')}
      description={t('fellowship.retention.submitted.description')}
      footer={
        <>
          <Icon name="clock" size={16} className="mr-1 shrink-0 text-chip-icon" />
          <FootnoteText className="shrink-0">{t('fellowship.retention.timer.ensureAwareness')}</FootnoteText>
          <div className="ml-auto flex shrink-0 gap-2">
            <Slot
              id={evidenceSubmitSlot}
              props={{ mode: 'edit' as const, evidenceContent: evidenceContent?.content }}
            />
          </div>
        </>
      }
    >
      <RetentionTimeline
        steps={submittedTimelineSteps}
        value={timelineValue}
        submissionPosition={submissionPosition}
        submissionTooltip={submissionTooltip}
      />
    </WidgetContainer>
  );
});

const ReferendumCreated = memo(() => {
  const { t } = useI18n();

  const { data: referendum } = useMemberRetentionReferendum();
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

  const title = nobodyVoted ? t('fellowship.votingHistory.noVotes') : t('fellowship.votingHistory.subtitleRetention');

  const voteLevel =
    !nobodyVoted &&
    (pending ? <Skeleton width={12} height="1lh" /> : <span className={levelClassName}>{t(levelTextKey)}</span>);

  if (!referendum) return null;

  const referendumId = referendum?.id ?? '—';

  return (
    <WidgetContainer
      title={t('fellowship.retention.referendumCreated.title', { referendumId })}
      description={
        <FootnoteText>
          {title} {voteLevel}
        </FootnoteText>
      }
      footer={
        <>
          <TimerToBlock endBlock={referendum.ends} shortDateFormat />
          <FootnoteText className="text-text-primary">
            {t('fellowship.retention.referendumCreated.description')}
          </FootnoteText>
          <Slot id={referendumWidgetActionSlot} props={{ referendum }} />
        </>
      }
    />
  );
});

const useRetentionData = () => {
  const { t } = useI18n();
  const api = useFellowshipApi();
  const { data: currentBlock } = useFellowshipBlock();
  const { data: retentionPeriodDates } = useRetentionPeriodDates();
  const { data: retentionPeriod } = useRetentionPeriod();

  const fromDateFormatted =
    nonNullable(retentionPeriodDates) && nonNullable(retentionPeriodDates.from)
      ? formatDate(retentionPeriodDates.from, 'dd.MM.yy')
      : null;
  const toDateFormatted =
    nonNullable(retentionPeriodDates) && nonNullable(retentionPeriodDates.to)
      ? formatDate(retentionPeriodDates.to, 'dd.MM.yy')
      : null;

  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (nullable(retentionPeriodDates) || nullable(retentionPeriodDates.from) || nullable(retentionPeriodDates.to))
      return [];

    const periodEndDate = retentionPeriodDates.to;

    const warningStartDate = subDays(periodEndDate, WARNING_THRESHOLD_DAYS);
    const dangerStartDate = subDays(periodEndDate, DANGER_THRESHOLD_DAYS);

    return [
      {
        baseColorClass: cnTw('bg-icon-blue-line'),
        filledColorClass: cnTw('bg-accent-background'),
        onHoverTooltipText: t('fellowship.retention.timeline.safeZone', {
          from: fromDateFormatted,
          to: formatDate(warningStartDate, 'dd.MM.yy'),
        }),
        length: SAFE_ZONE_LENGTH,
      },
      {
        baseColorClass: cnTw('bg-badge-orange-background-default'),
        filledColorClass: cnTw('bg-icon-warning'),
        onHoverTooltipText: t('fellowship.retention.timeline.warningZone', {
          from: formatDate(warningStartDate, 'dd.MM.yy'),
          to: formatDate(dangerStartDate, 'dd.MM.yy'),
        }),
        length: WARNING_ZONE_LENGTH,
      },
      {
        baseColorClass: cnTw('bg-badge-red-background'),
        filledColorClass: cnTw('bg-icon-negative'),
        onHoverTooltipText: t('fellowship.retention.timeline.dangerZone', {
          from: formatDate(dangerStartDate, 'dd.MM.yy'),
          to: toDateFormatted,
        }),
        length: DANGER_ZONE_LENGTH,
      },
    ];
  }, [t, retentionPeriodDates, fromDateFormatted, toDateFormatted]);

  const timelineValue = useMemo(() => {
    if (nullable(api) || nullable(retentionPeriod) || nullable(currentBlock)) return 0;

    const blockTimeMs = getExpectedBlockTime(api).toNumber();
    if (!Number.isFinite(blockTimeMs) || blockTimeMs <= 0) return 0;

    const fromBlock = Number(retentionPeriod.from);
    const toBlock = Number(retentionPeriod.to);
    const nowBlock = Number(currentBlock);

    if (!Number.isFinite(fromBlock) || !Number.isFinite(toBlock) || toBlock <= fromBlock) return 0;

    const warningBlocks = Math.ceil((WARNING_THRESHOLD_DAYS * MS_PER_DAY) / blockTimeMs);
    const dangerBlocks = Math.ceil((DANGER_THRESHOLD_DAYS * MS_PER_DAY) / blockTimeMs);

    const warningStartBlock = Math.max(fromBlock, toBlock - warningBlocks);
    const dangerStartBlock = Math.max(fromBlock, toBlock - dangerBlocks);

    const safeSegment = Math.max(1, warningStartBlock - fromBlock);
    const warningSegment = Math.max(1, dangerStartBlock - warningStartBlock);
    const dangerSegment = Math.max(1, toBlock - dangerStartBlock);

    const clampedNow = Math.min(Math.max(nowBlock, fromBlock), toBlock);

    if (clampedNow < warningStartBlock) {
      const progress = (clampedNow - fromBlock) / safeSegment;
      return Math.min(SAFE_ZONE_LENGTH, Math.max(0, progress * SAFE_ZONE_LENGTH));
    }

    if (clampedNow < dangerStartBlock) {
      const progress = (clampedNow - warningStartBlock) / warningSegment;
      return SAFE_ZONE_LENGTH + Math.min(WARNING_ZONE_LENGTH, Math.max(0, progress * WARNING_ZONE_LENGTH));
    }

    const progress = (clampedNow - dangerStartBlock) / dangerSegment;
    return (
      SAFE_ZONE_LENGTH + WARNING_ZONE_LENGTH + Math.min(DANGER_ZONE_LENGTH, Math.max(0, progress * DANGER_ZONE_LENGTH))
    );
  }, [api, retentionPeriod, currentBlock]);

  return {
    retentionPeriod,
    fromDateFormatted,
    toDateFormatted,
    retentionPeriodDates,
    timelineSteps,
    timelineValue,
  };
};

type WidgetContainerProps = PropsWithChildren<{
  title: string;
  footer: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}>;

const WidgetContainer = ({ title, description, icon, children, footer }: WidgetContainerProps) => {
  const { t } = useI18n();

  return (
    <Box gap={2}>
      <CaptionText>{t('fellowship.retention.title')}</CaptionText>
      <div className="rounded-lg bg-block-background-default p-4">
        <Box gap={4}>
          <Box gap={3}>
            <Box gap={1}>
              <Box direction="row" gap={2} verticalAlign="center">
                {icon}
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
