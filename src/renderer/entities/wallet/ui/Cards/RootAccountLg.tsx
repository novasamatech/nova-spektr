import { type MouseEvent } from 'react';

import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, IconButton, Identicon } from '@/shared/ui';

type Props = {
  name: string;
  accountId: AccountId;
  className?: string;
  onInfoClick?: () => void;
};

export const RootAccountLg = ({ name, accountId, className, onInfoClick }: Props) => {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cnTw('flex w-full items-center gap-x-2', className)}>
      <div className="flex w-full items-center gap-x-2 overflow-hidden py-[3px]" onClick={handleClick}>
        <Identicon
          theme="jdenticon"
          background={false}
          canCopy={false}
          address={toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX })}
          size={28}
        />
        <BodyText className="truncate text-text-secondary">{name}</BodyText>
      </div>

      <IconButton name="details" className="mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
