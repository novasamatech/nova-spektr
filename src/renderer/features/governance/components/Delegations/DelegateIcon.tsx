import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { Icon, Identicon } from '@/shared/ui';
import { addDelegationUtils } from '@/widgets/DelegationModal/common/utils';

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateIcon = ({ delegate, className }: Props) => {
  if (!delegate.name) return <Identicon address={delegate.accountId} size={46} />;

  if (addDelegationUtils.isDefaultImage(delegate.image)) {
    <div
      className={cnTw(
        'flex h-11.5 w-11.5 items-center justify-center rounded-full',
        delegate.isOrganization ? 'bg-badge-orange-background-default' : 'bg-badge-background',
      )}
    >
      {delegate.isOrganization ? (
        <Icon className="text-icon-warning" name="organization" />
      ) : (
        <Icon className="text-icon-accent" name="individual" />
      )}
    </div>;
  }

  return <img src={delegate.image} alt={delegate.name} className={cnTw('h-11.5 w-11.5 rounded-full', className)} />;
};
