import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { HeadlineText, Truncate } from '@/shared/ui';

type Props = {
  delegate: DelegateAccount;
  className?: string;
  wrapperClassName?: string;
};

export const DelegateTitle = ({ delegate, className, wrapperClassName }: Props) => {
  const delegateTitle = delegate.name || (
    <Truncate className={cnTw(className)} ellipsis="..." start={4} end={4} text={delegate.accountId} />
  );

  return <HeadlineText className={cnTw(wrapperClassName)}>{delegateTitle}</HeadlineText>;
};
