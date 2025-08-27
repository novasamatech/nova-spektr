import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';

const isDefaultImage = (image?: string) => !image || image.includes('default');

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateIcon = ({ delegate, className }: Props) => {
  if (!delegate.name) return <Identicon background={false} value={delegate.accountId} size={46} />;

  if (isDefaultImage(delegate.image)) {
    return (
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
      </div>
    );
  }

  return <img src={delegate.image} alt={delegate.name} className={cnTw('h-11.5 w-11.5 rounded-full', className)} />;
};
