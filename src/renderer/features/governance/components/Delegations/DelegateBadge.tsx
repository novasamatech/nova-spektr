import { type DelegateAccount } from '@/shared/api/governance';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateBadge = ({ delegate, className }: Props) => {
  const { t } = useI18n();

  if (!delegate.name) {
    return null;
  }

  return (
    <CaptionText
      className={cnTw(
        'rounded-full px-2 py-1 uppercase',
        delegate.isOrganization
          ? 'bg-badge-orange-background-default text-text-warning'
          : 'bg-badge-background text-icon-accent',
        className,
      )}
    >
      {t('governance.addDelegation.card.' + (delegate.isOrganization ? 'organization' : 'individual'))}
    </CaptionText>
  );
};
