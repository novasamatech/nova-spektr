import { memo } from 'react';

import { type WalletType } from '@/shared/core';
import { cnTw } from '@/shared/lib/utils';
import { BodyText } from '@/shared/ui';
import { WalletIcon } from '@/entities/wallet';

type Props = {
  name: string;
  type: WalletType;
  className?: string;
};

// TODO: Rebuild with new components
export const WalletItem = memo(({ name, type, className = '' }: Props) => {
  return (
    <div className={cnTw('flex w-full items-center gap-x-2', className)}>
      <WalletIcon type={type} />

      <div className="flex max-w-[348px] flex-col">
        <BodyText as="span" className="truncate tracking-tight text-text-secondary">
          {name}
        </BodyText>
      </div>
    </div>
  );
});
