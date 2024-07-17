import { memo } from 'react';

import { WalletIcon } from '@entities/wallet';
import { type WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';

type Props = {
  name: string;
  type: WalletType;
};

// TODO: Rebuild with new components
export const WalletItem = memo(({ name, type }: Props) => {
  return (
    <div className="flex items-center gap-x-2 w-full">
      <WalletIcon type={type} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText as="span" className="text-text-secondary tracking-tight truncate">
          {name}
        </BodyText>
      </div>
    </div>
  );
});
