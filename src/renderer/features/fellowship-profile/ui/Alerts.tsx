import { type ReactNode, memo } from 'react';
import { generatePath } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { cnTw, nonNullable, nullable, toRomanNumeral } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { FootnoteText, HeadlineText, Icon, IconButton } from '@/shared/ui';
import { useFellowshipChain } from '@/aggregates/fellowship-network';
import { navigationModel } from '@/features/navigation';
import { useAlert } from '../hooks/useAlert';
import { alertsModel } from '../model/alerts';

const ICONS = {
  success: 'checkmarkOutline',
  warn: 'warn',
} as const;

export const Alerts = () => {
  const alert = useAlert();
  const chain = useFellowshipChain();

  if (nullable(alert) || nullable(chain)) return null;

  const handleClose = () => alertsModel.markAsSeen(alert.id);

  if (
    alert.type === 'proven' ||
    alert.type === 'promoted' ||
    alert.type === 'promotionFailed' ||
    alert.type === 'retentionFailed'
  ) {
    return (
      <ReferendumAlert
        type={alert.type}
        rank={alert.rank}
        referendumId={alert.referendumId}
        chainId={chain.chainId}
        onClose={handleClose}
      />
    );
  }

  if (
    alert.type === 'retentionRequestWhenPromotionReferendumExists' ||
    alert.type === 'promotionRequestWhenRetentionReferendumExists'
  ) {
    return <EvidenceConflictAlert type={alert.type} onClose={handleClose} />;
  }

  if (alert.type === 'bumped') {
    return <BumpedAlert rank={alert.rank} onClose={handleClose} />;
  }

  return null;
};

type BaseAlertProps = {
  variant: 'success' | 'warn';
  title: string;
  description: string;
  action?: ReactNode;
  onClose: () => void;
};

const BaseAlert = memo(({ variant, title, description, action, onClose }: BaseAlertProps) => {
  return (
    <div className="mb-3 flex flex-col gap-y-2">
      <div
        className={cnTw(
          'w-full rounded-lg border p-4',
          variant === 'success' && 'border-icon-positive bg-alert-background-positive',
          variant === 'warn' && 'border-icon-warning bg-alert-background-warning',
        )}
      >
        <div className="flex items-start gap-x-2">
          <Icon
            name={ICONS[variant]}
            size={14}
            className={cnTw('my-[3px] shrink-0', {
              'text-icon-positive': variant === 'success',
              'text-icon-warning': variant === 'warn',
            })}
          />
          <div className="flex flex-1 flex-col gap-y-1">
            <HeadlineText>{title}</HeadlineText>
            <FootnoteText>{description}</FootnoteText>
            {action}
          </div>
          <IconButton name="close" size={16} onClick={onClose} />
        </div>
      </div>
    </div>
  );
});

type ReferendumAlertType = 'proven' | 'promoted' | 'promotionFailed' | 'retentionFailed';

type ReferendumAlertProps = {
  type: ReferendumAlertType;
  rank: number | null;
  referendumId: number;
  chainId: string;
  onClose: () => void;
};

const REFERENDUM_CONFIG = {
  proven: {
    title: 'fellowship.profile.alerts.proven.title',
    description: 'fellowship.profile.alerts.proven.description',
    variant: 'success',
  },
  promoted: {
    title: 'fellowship.profile.alerts.promoted.title',
    description: 'fellowship.profile.alerts.promoted.description',
    variant: 'success',
  },
  promotionFailed: {
    title: 'fellowship.profile.alerts.promotionFailed.title',
    description: 'fellowship.profile.alerts.promotionFailed.description',
    variant: 'warn',
  },
  retentionFailed: {
    title: 'fellowship.profile.alerts.retentionFailed.title',
    description: 'fellowship.profile.alerts.retentionFailed.description',
    variant: 'warn',
  },
} as const;

const ReferendumAlert = memo(({ type, rank, referendumId, chainId, onClose }: ReferendumAlertProps) => {
  const { t } = useI18n();

  const config = REFERENDUM_CONFIG[type];
  const title = nonNullable(rank) ? t(config.title, { rank: toRomanNumeral(rank) }) : t(config.title);
  const description = nonNullable(rank) ? t(config.description, { rank: toRomanNumeral(rank) }) : t(config.description);

  const handleActionClick = () => {
    const path = generatePath(Paths.FELLOWSHIP_REFERENDUM, {
      chainId,
      referendumId: referendumId.toString(),
    });
    navigationModel.events.navigateTo(path);
  };

  return (
    <BaseAlert
      variant={config.variant}
      title={title}
      description={description}
      action={
        <button
          className="cursor-pointer self-start font-semibold text-primary-button-background-default"
          onClick={handleActionClick}
        >
          {t('fellowship.profile.alerts.viewReferendum')}
        </button>
      }
      onClose={onClose}
    />
  );
});

type BumpedAlertProps = {
  rank: number;
  onClose: () => void;
};

const BumpedAlert = memo(({ rank, onClose }: BumpedAlertProps) => {
  const { t } = useI18n();

  return (
    <BaseAlert
      variant="warn"
      title={t('fellowship.profile.alerts.bumped.title', { rank: toRomanNumeral(rank) })}
      description={t('fellowship.profile.alerts.bumped.description')}
      onClose={onClose}
    />
  );
});

type EvidenceConflictType =
  | 'retentionRequestWhenPromotionReferendumExists'
  | 'promotionRequestWhenRetentionReferendumExists';

type EvidenceConflictAlertProps = {
  type: EvidenceConflictType;
  onClose: () => void;
};

const EVIDENCE_CONFLICT_CONFIG = {
  retentionRequestWhenPromotionReferendumExists: {
    title: 'fellowship.profile.alerts.retentionRequestWhenPromotionReferendumExists.title',
    description: 'fellowship.profile.alerts.retentionRequestWhenPromotionReferendumExists.description',
    action: 'fellowship.profile.alerts.resubmitPromotionEvidence',
  },
  promotionRequestWhenRetentionReferendumExists: {
    title: 'fellowship.profile.alerts.promotionRequestWhenRetentionReferendumExists.title',
    description: 'fellowship.profile.alerts.promotionRequestWhenRetentionReferendumExists.description',
    action: 'fellowship.profile.alerts.resubmitRetentionEvidence',
  },
} as const;

const EvidenceConflictAlert = memo(({ type, onClose }: EvidenceConflictAlertProps) => {
  const { t } = useI18n();

  const config = EVIDENCE_CONFLICT_CONFIG[type];

  return (
    <BaseAlert
      variant="warn"
      title={t(config.title)}
      description={t(config.description)}
      action={
        <button className="cursor-pointer self-start font-semibold text-primary-button-background-default">
          {t(config.action)}
        </button>
      }
      onClose={onClose}
    />
  );
});
