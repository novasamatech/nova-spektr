import { useI18n } from '@/shared/i18n';
import { type RecipientWarning } from '@/shared/lib/recipient-verification';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';

type Props = {
  warning: RecipientWarning;
  /** 'recipient' — operations list row; 'address' — detail/approve rows. */
  variant: 'recipient' | 'address';
  className?: string;
};

export const UnknownRecipientBadge = ({ warning, variant, className }: Props) => {
  const { t } = useI18n();

  if (warning === 'none') return null;

  const key = `recipientVerification.badge.${variant}${warning === 'unknown' ? 'Unknown' : 'Unverifiable'}` as const;

  return (
    <div
      className={cnTw(
        'inline-flex shrink-0 items-center rounded-[20px] border border-alert-border-warning bg-alert-background-warning px-2.5 py-1',
        className,
      )}
    >
      <CaptionText className="text-text-warning uppercase">{t(key)}</CaptionText>
    </div>
  );
};
