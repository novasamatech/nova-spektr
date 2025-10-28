import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw, toRomanNumeral } from '@/shared/lib/utils';
import { FootnoteText, HeadlineText, Icon, IconButton } from '@/shared/ui';
import { alertsModel } from '../model/alerts';

const CONFIG = {
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
  retentionRequestWhenPromotionReferendumExists: {
    title: 'fellowship.profile.alerts.retentionRequestWhenPromotionReferendumExists.title',
    description: 'fellowship.profile.alerts.retentionRequestWhenPromotionReferendumExists.description',
    variant: 'warn',
  },
  promotionRequestWhenRetentionReferendumExists: {
    title: 'fellowship.profile.alerts.promotionRequestWhenRetentionReferendumExists.title',
    description: 'fellowship.profile.alerts.promotionRequestWhenRetentionReferendumExists.description',
    variant: 'warn',
  },
  bumped: {
    title: 'fellowship.profile.alerts.bumped.title',
    description: 'fellowship.profile.alerts.bumped.description',
    variant: 'warn',
  },
  severalReferendums: {
    title: 'fellowship.profile.alerts.severalReferendums.title',
    description: 'fellowship.profile.alerts.severalReferendums.description',
    variant: 'info',
  },
} as const;

const ICONS = {
  success: 'checkmarkOutline',
  warn: 'warn',
  info: 'info',
} as const;

export const Alerts = () => {
  const { t } = useI18n();

  const firstAlert = useUnit(alertsModel.$firstAlert);

  if (!firstAlert) return null;

  const { title, description, variant } = CONFIG[firstAlert.type];

  let actualTitle = t(title);
  if (
    firstAlert.type === 'bumped' ||
    firstAlert.type === 'promoted' ||
    firstAlert.type === 'promotionFailed' ||
    firstAlert.type === 'retentionFailed'
  ) {
    const rank = firstAlert.record && 'rank' in firstAlert.record ? firstAlert.record.rank : null;
    if (rank) {
      actualTitle = t(title, { rank: toRomanNumeral(rank) });
    }
  }

  return (
    <div className="mb-3 flex flex-col gap-y-2">
      <div
        key={firstAlert.id}
        className={cnTw(
          'w-full rounded-lg border p-4',
          variant === 'success' && 'border-icon-positive bg-alert-background-positive',
          variant === 'warn' && 'border-icon-warning bg-alert-background-warning',
          variant === 'info' && 'border-icon-alert bg-alert-background',
        )}
      >
        <div className="flex items-start gap-x-2">
          <Icon
            name={ICONS[variant]}
            size={14}
            className={cnTw('my-[3px] shrink-0', {
              'text-icon-positive': variant === 'success',
              'text-icon-warning': variant === 'warn',
              'text-icon-alert': variant === 'info',
            })}
          />
          <div className="flex flex-1 flex-col gap-y-1">
            <HeadlineText>{actualTitle}</HeadlineText>
            <FootnoteText>{t(description)}</FootnoteText>
          </div>
          <IconButton name="close" size={16} onClick={() => alertsModel.markAsSeen(firstAlert.id)} />
        </div>
      </div>
    </div>
  );
};
