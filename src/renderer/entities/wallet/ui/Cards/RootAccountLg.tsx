import { MouseEvent } from 'react';

import type { AccountId } from '@shared/core';
import { Identicon, BodyText, IconButton } from '@shared/ui';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@shared/lib/utils';

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
    <div className={cnTw('relative flex items-center gap-x-2 w-full', className)}>
      <div className="flex items-center gap-x-2 w-full py-[3px]" onClick={handleClick}>
        <Identicon
          theme="jdenticon"
          background={false}
          canCopy={false}
          address={toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX })}
          size={28}
        />
        <BodyText className="text-text-secondary flex-1">{name}</BodyText>
      </div>

      <IconButton name="info" className="absolute right-2 mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
