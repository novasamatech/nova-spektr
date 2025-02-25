import { useStoreMap, useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw, nullable, toAccountId } from '@/shared/lib/utils';
import { HeadlineText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { identity } from '@/domains/network';
import { networkSelectorModel } from '../../model/networkSelector';

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateTitle = ({ delegate, className }: Props) => {
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const delegateName = useStoreMap({
    store: identity.$list,
    keys: [chain?.chainId, delegate.accountId, delegate.address],
    fn: (identity, [chainId, accountId, address]) => {
      if (nullable(chainId)) return null;

      return delegate.name ?? identity[chainId]?.[toAccountId(address ?? accountId)]?.name ?? null;
    },
  });

  if (nullable(chain) || nullable(delegate.accountId)) return null;

  return (
    <HeadlineText className={cnTw('w-full', className)}>
      <Account hideAddress hideIcon title={delegateName || undefined} accountId={delegate.accountId} chain={chain} />
    </HeadlineText>
  );
};
