import { memo } from 'react';

import { WalletIcon } from '@entities/wallet';
import { WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { cnTw } from '@shared/lib/utils';

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
