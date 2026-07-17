import { useI18n } from '@/shared/i18n';
import { type RecipientWarning } from '@/shared/lib/recipient-verification';
import { FootnoteText, Icon } from '@/shared/ui';

type Props = {
  warning: RecipientWarning;
  /**
   * 'note' — one-line note (transfer confirm); 'review' — title + body
   * (multisig review panel).
   */
  variant: 'note' | 'review';
};

export const UnknownRecipientAlert = ({ warning, variant }: Props) => {
  const { t } = useI18n();

  if (warning === 'none') return null;

  const isUnverifiable = warning === 'unverifiable';

  if (variant === 'note') {
    return (
      <div className="flex w-full items-center gap-x-2 rounded-lg border border-alert-border-warning bg-alert-background-warning px-3 py-2">
        <Icon name="warn" size={14} className="shrink-0 text-icon-warning" />
        <FootnoteText>
          {t(isUnverifiable ? 'recipientVerification.confirmNoteUnverifiable' : 'recipientVerification.confirmNote')}
        </FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-x-2 rounded-lg border border-alert-border-warning bg-alert-background-warning p-3">
      <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
      <div className="flex flex-col gap-y-0.5">
        <FootnoteText className="font-medium">
          {t(
            isUnverifiable
              ? 'recipientVerification.reviewAlert.titleUnverifiable'
              : 'recipientVerification.reviewAlert.title',
          )}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">
          {t(
            isUnverifiable
              ? 'recipientVerification.reviewAlert.bodyUnverifiable'
              : 'recipientVerification.reviewAlert.body',
          )}
        </FootnoteText>
      </div>
    </div>
  );
};
