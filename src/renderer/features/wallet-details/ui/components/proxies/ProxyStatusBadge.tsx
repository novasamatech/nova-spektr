import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type LabelVariant, Label } from '@/shared/ui-kit';
import { type WalletProxyStatus } from '../../../model/proxies-model';

const STATUS_TO_LABEL_VARIANT: Record<WalletProxyStatus, LabelVariant> = {
  verified: 'green',
  not_verified: 'orange',
  pending_verification: 'blue',
  pending_addition: 'lightBlue',
  not_verified_no_wallet: 'gray',
};

const STATUS_I18N_KEYS: Record<WalletProxyStatus, string> = {
  verified: 'walletDetails.proxies.statusVerified',
  not_verified: 'walletDetails.proxies.statusNotVerified',
  pending_verification: 'walletDetails.proxies.statusPendingVerification',
  pending_addition: 'walletDetails.proxies.statusPendingDelegation',
  not_verified_no_wallet: 'walletDetails.proxies.statusNotVerified',
};

type Props = {
  status: WalletProxyStatus;
  className?: string;
};

export const ProxyStatusBadge = ({ status, className }: Props) => {
  const { t } = useI18n();

  return (
    <span className={cnTw('inline-flex shrink-0', className)}>
      <Label variant={STATUS_TO_LABEL_VARIANT[status]}>{t(STATUS_I18N_KEYS[status])}</Label>
    </span>
  );
};
