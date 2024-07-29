import { memo } from 'react';

import { type WalletType } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { BodyText } from '@shared/ui';
import { WalletIcon } from '@entities/wallet';

type Props = {
  name: string;
  type: WalletType;
  className?: string;
};

// TODO: Rebuild with new components
export const WalletItem = memo(({ name, type, className = '' }: Props) => {
  return (
    <div className={cnTw('flex items-center gap-x-2 w-full', className)}>
      <WalletIcon type={type} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText as="span" className="text-text-secondary tracking-tight truncate">
          {name}
        </BodyText>
      </div>
    </div>
  );
});
