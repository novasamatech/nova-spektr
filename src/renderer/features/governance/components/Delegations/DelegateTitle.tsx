import { useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw, nullable } from '@/shared/lib/utils';
import { HeadlineText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { networkSelectorModel } from '../../model/networkSelector';

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateTitle = ({ delegate, className }: Props) => {
  const chain = useUnit(networkSelectorModel.$governanceChain);
  if (nullable(chain) || nullable(delegate.accountId)) return null;

  return (
    <HeadlineText className={cnTw('w-full', className)}>
      <Account hideAddress hideIcon title={delegate.name} accountId={delegate.accountId} chain={chain} />
    </HeadlineText>
  );
};
