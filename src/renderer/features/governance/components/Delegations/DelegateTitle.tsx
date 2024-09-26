import { useUnit } from 'effector-react';

import { type DelegateAccount } from '@/shared/api/governance';
import { cnTw } from '@/shared/lib/utils';
import { HeadlineText, IconButton, Truncate } from '@/shared/ui';
import { ExplorersPopover } from '@/entities/wallet';
import { networkSelectorModel } from '../../model/networkSelector';

type Props = {
  delegate: DelegateAccount;
  className?: string;
};

export const DelegateTitle = ({ delegate, className }: Props) => {
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const delegateTitle = delegate.name || <Truncate ellipsis="..." start={4} end={4} text={delegate.accountId} />;

  return (
    <HeadlineText className={cnTw('w-full', className)}>
      <span className="inline-flex w-full items-center">
        {delegateTitle}{' '}
        {delegate.address && (
          <span>
            <ExplorersPopover
              contextClassName="left-0"
              button={<IconButton className="ml-2 flex" name="info" />}
              address={delegate.address}
              addressPrefix={chain?.addressPrefix}
              explorers={chain?.explorers}
            />
          </span>
        )}
      </span>
    </HeadlineText>
  );
};
