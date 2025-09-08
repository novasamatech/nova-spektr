import { type MouseEvent, type PropsWithChildren } from 'react';

import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';

type Props = PropsWithChildren<{
  name: string;
  accountId: AccountId;
  className?: string;
}>;

export const RootAccountLg = ({ name, accountId, className, children }: Props) => {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cnTw('flex w-full items-center gap-x-2', className)}>
      <div className="flex w-full items-center gap-x-2 overflow-hidden py-[3px]" onClick={handleClick}>
        <Identicon theme="jdenticon" background={false} canCopy={false} address={toAddress(accountId)} size={28} />
        <BodyText className="truncate text-text-secondary">{name}</BodyText>
      </div>

      {children ? <div className="mx-1.5 flex gap-2">{children}</div> : null}
    </div>
  );
};
