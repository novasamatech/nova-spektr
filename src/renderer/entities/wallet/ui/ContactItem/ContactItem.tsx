import { type MouseEvent } from 'react';

import { type AccountId, type Address } from '@shared/core';
import { cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, HelpText, IconButton, Identicon } from '@shared/ui';

type Props = {
  name?: string;
  address: Address | AccountId;
  addressPrefix?: number;
  size?: number;
  className?: string;
  hideAddress?: boolean;
  onInfoClick?: () => void;
};
export const ContactItem = ({
  name,
  address,
  addressPrefix,
  size = 20,
  hideAddress = false,
  className,
  onInfoClick,
}: Props) => {
  const formattedAddress = toAddress(address, { prefix: addressPrefix });

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className={cnTw('group flex w-full items-center gap-x-2', className)}>
      <div className="flex w-full items-center gap-x-2 overflow-hidden py-[3px]" onClick={handleClick}>
        <Identicon address={formattedAddress} size={size} background={false} />

        <div className="flex flex-col">
          {name && (
            <BodyText
              className={cnTw(
                'truncate text-text-secondary transition-colors',
                'group-hover:text-text-primary group-focus:text-text-primary',
              )}
            >
              {name}
            </BodyText>
          )}
          {!hideAddress && <HelpText className="truncate text-text-tertiary">{formattedAddress}</HelpText>}
        </div>
      </div>

      <IconButton name="details" className="mx-1.5" onClick={onInfoClick} />
    </div>
  );
};
