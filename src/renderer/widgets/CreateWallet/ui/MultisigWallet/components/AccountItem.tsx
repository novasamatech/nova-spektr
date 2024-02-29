import { memo } from 'react';

import { AccountId } from '@shared/core';
import { BodyText, Identicon } from '@shared/ui';

type Props = {
  name: string;
  accountId: AccountId;
};

// TODO: Rebuild with new components
export const AccountItem = memo(({ name, accountId }: Props) => {
  return (
    <div className="flex items-center gap-x-2 w-full">
      <Identicon address={accountId} size={20} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText as="span" className="text-text-secondary tracking-tight truncate">
          {name}
        </BodyText>
      </div>
    </div>
  );
});
