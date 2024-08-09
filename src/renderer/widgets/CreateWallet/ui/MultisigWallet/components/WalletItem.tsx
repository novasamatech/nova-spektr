import { memo } from 'react';

import { type WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { WalletIcon } from '@entities/wallet';

type Props = {
  name: string;
  type: WalletType;
};

// TODO: Rebuild with new components
export const WalletItem = memo(({ name, type }: Props) => {
  return (
    <div className="flex w-full items-center gap-x-2">
      <WalletIcon type={type} />

      <div className="flex max-w-[348px] flex-col">
        <BodyText as="span" className="truncate tracking-tight text-text-secondary">
          {name}
        </BodyText>
      </div>
    </div>
  );
});
