import { type MouseEvent } from 'react';

import type { AccountId } from '@shared/core';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, IconButton, Identicon } from '@shared/ui';

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
    <div className={cnTw('flex items-center gap-x-2 w-full', className)}>
      <div className="flex items-center gap-x-2 w-full py-[3px] overflow-hidden" onClick={handleClick}>
        <Identicon
          theme="jdenticon"
          background={false}
          canCopy={false}
          address={toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX })}
          size={28}
        />
        <BodyText className="text-text-secondary truncate">{name}</BodyText>
      </div>

      <IconButton name="info" className="mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
