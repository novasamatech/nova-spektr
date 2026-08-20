import { useI18n } from '@/shared/i18n';
import { type RecipientWarning } from '@/shared/lib/recipient-verification';
import { FootnoteText, Icon } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';

type Props = {
  warning: RecipientWarning;
  /**
   * Picks the copy set: transfer form, multisig signing, or draft creation.
   * Ignored while the warning is `unverifiable` — every context shares the
   * reconnect copy then.
   */
  context: 'transfer' | 'multisigSign' | 'draftCreate';
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

export const UnknownRecipientAckBox = ({ warning, context, checked, onToggle }: Props) => {
  const { t } = useI18n();

  if (warning === 'none') return null;

  const isUnverifiable = warning === 'unverifiable';
  const copyRoot = isUnverifiable ? 'recipientVerification.unverifiable' : `recipientVerification.${context}`;

  return (
    <div className="w-full rounded-lg border border-alert-border-warning bg-alert-background-warning p-[15px]">
      <div className="flex items-start gap-x-2">
        <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
        <div className="flex flex-col gap-y-1">
          <FootnoteText className="font-medium">{t(`${copyRoot}.title`)}</FootnoteText>
          <FootnoteText className="text-text-secondary">{t(`${copyRoot}.body`)}</FootnoteText>
        </div>
      </div>
      <hr className="my-3 border-alert-border-warning" />
      <Checkbox checked={checked} onChange={checked => onToggle(checked)}>
        <FootnoteText>{t(`${copyRoot}.ackLabel`)}</FootnoteText>
      </Checkbox>
    </div>
  );
};
