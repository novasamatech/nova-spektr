import { differenceInMilliseconds, formatDate, subDays } from 'date-fns';
import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, type ReactNode, memo, useMemo } from 'react';

import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, TitleText } from '@/shared/ui';
import { Box, Skeleton, type TimelineStep } from '@/shared/ui-kit';
import { type Member, type Referendum, memberService, votingHistoryService } from '@/domains/collectives';
import {
  DANGER_THRESHOLD_DAYS,
  RetentionWidgetState,
  WARNING_THRESHOLD_DAYS,
  fellowshipRetention,
} from '../models/retention';
import { votesModel } from '../models/votes';

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

type Props = {
  member: Member;
};

const SkeletonLoader = () => <Skeleton width="100%" height="132px" />;

export const RetentionWidget = memo(({ member }: Props) => {
  useGate(fellowshipRetention.flow, member);

  const { t } = useI18n();
  const state = useUnit(fellowshipRetention.$widgetState);
  const { fromDateFormatted, toDateFormatted, retentionPeriod, timelineSteps, timelineValue } = useRetentionData();

  if (!memberService.shouldProve(member)) return null;

  if (!retentionPeriod) return <SkeletonLoader />;

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
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
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
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.untilEnd')}</FootnoteText>
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.retention.button.submitReport')}
            </Button>
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
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.retention.button.submitReport')}
            </Button>
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
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.retention.button.submitReport')}
            </Button>
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
            <TimerToBlock endBlock={retentionPeriod.to} shortDateFormat />
            <FootnoteText className="text-text-primary">{t('fellowship.retention.timer.riskBumped')}</FootnoteText>
            <Button size="sm" className="ml-auto" onClick={() => {}}>
              {t('fellowship.retention.button.submitReport')}
            </Button>
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

  const { retentionPeriodDates, timelineValue } = useRetentionData();
  const retentionEvidenceSubmissionDate = useUnit(fellowshipRetention.$retentionEvidenceSubmissionDate);

  const submittedTimelineSteps: TimelineStep[] = useMemo(
    () => [
      {
        baseColorClass: cnTw('bg-accent-background'),
        filledColorClass: cnTw('bg-icon-blue-line'),
        onHoverTooltipText: t('fellowship.retention.timeline.safeZone'),
        length: TOTAL_LENGTH,
      },
    ],
    [t],
  );

  const submissionPosition = useMemo(() => {
    if (!retentionEvidenceSubmissionDate || !retentionPeriodDates) return 50;

    const submissionDate = new Date(retentionEvidenceSubmissionDate);
    const totalDuration = differenceInMilliseconds(retentionPeriodDates.to, retentionPeriodDates.from);
    const elapsed = differenceInMilliseconds(submissionDate, retentionPeriodDates.from);
    const position = (elapsed / totalDuration) * 100;

    return Math.max(10, Math.min(90, position));
  }, [retentionEvidenceSubmissionDate, retentionPeriodDates]);

  const submissionTooltip = useMemo(() => {
    if (!retentionEvidenceSubmissionDate) return undefined;
    const date = formatDate(new Date(retentionEvidenceSubmissionDate), 'dd.MM.yy');
    return t('fellowship.retention.timeline.submittedOn', { date });
  }, [retentionEvidenceSubmissionDate, t]);

  return (
    <WidgetContainer
      icon={<Icon name="checkmarkOutline" size={16} className="text-text-positive" />}
      title={t('fellowship.retention.submitted.title')}
      description={t('fellowship.retention.submitted.description')}
      footer={
        <>
          <FootnoteText>{t('fellowship.retention.timer.ensureAwareness')}</FootnoteText>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={() => {}}>
              {t('fellowship.retention.button.view')}
            </Button>
            <Button size="sm" pallet="secondary" variant="fill" onClick={() => {}}>
              {t('fellowship.retention.button.edit')}
            </Button>
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

  const referendum = useUnit(fellowshipRetention.$retentionReferendum);
  const votes = useUnit(votesModel.$votesList);
  const pending = useUnit(votesModel.$pending);

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
      title={t('fellowship.retention.referendumCreated.title')}
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
  const retentionPeriodDates = useUnit(fellowshipRetention.$retentionPeriodDates);
  const retentionPeriod = useUnit(fellowshipRetention.$retentionPeriod);

  const fromDateFormatted = retentionPeriodDates ? formatDate(retentionPeriodDates.from, 'dd.MM.yy') : null;
  const toDateFormatted = retentionPeriodDates ? formatDate(retentionPeriodDates.to, 'dd.MM.yy') : null;

  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (!retentionPeriodDates) return [];

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

  // Calculate timeline position directly from elapsed time
  const timelineValue = useMemo(() => {
    if (!retentionPeriodDates) return 0;

    const now = new Date();
    const totalDuration = differenceInMilliseconds(retentionPeriodDates.to, retentionPeriodDates.from);

    if (totalDuration <= 0) return 0;

    const elapsed = differenceInMilliseconds(now, retentionPeriodDates.from);
    const progress = Math.min(elapsed / totalDuration, 1);

    return progress * TOTAL_LENGTH;
  }, [retentionPeriodDates]);

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
