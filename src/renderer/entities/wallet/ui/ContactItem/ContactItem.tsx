import { MouseEvent } from 'react';

import { cnTw, toAddress } from '@shared/lib/utils';
import { Identicon, BodyText, HelpText, IconButton } from '@shared/ui';
import type { Address, AccountId } from '@shared/core';

type Props = {
  name?: string;
  address: Address | AccountId;
  addressPrefix?: number;
  size?: number;
  className?: string;
  onInfoClick?: () => void;
};
export const ContactItem = ({ name, address, addressPrefix, size = 20, className, onInfoClick }: Props) => {
  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cnTw('group flex items-center gap-x-2 w-full', className)}>
      <div className="flex items-center gap-x-2 w-full py-[3px] overflow-hidden" onClick={handleClick}>
        <Identicon address={formattedAddress} size={size} background={false} />

        <div className="flex flex-col">
          {name && (
            <BodyText
              className={cnTw(
                'text-text-secondary truncate transition-colors',
                'group-hover:text-text-primary group-focus:text-text-primary',
              )}
            >
              {name}
            </BodyText>
          )}
          <HelpText className="text-text-tertiary truncate">{formattedAddress}</HelpText>
        </div>
      </div>

      <IconButton name="info" className="mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
