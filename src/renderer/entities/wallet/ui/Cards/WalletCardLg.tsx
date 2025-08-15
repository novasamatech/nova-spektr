import { type PropsWithChildren, type ReactNode } from 'react';

import { type Wallet } from '@/shared/core';
import { FootnoteText, HeadlineText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';

type Props = PropsWithChildren<{
  wallet: Wallet;
  description?: string | ReactNode;
  additionalInfo?: ReactNode;
  withoutName?: boolean;
}>;

export const WalletCardLg = ({ wallet, description, additionalInfo, children, withoutName }: Props) => {
  return (
    <div className="flex w-full min-w-0 items-center gap-x-2">
      <div className="relative">
        <WalletIcon type={wallet.type} size={42} />
        {additionalInfo}
      </div>
      <div className="flex min-w-0 flex-col">
        {!withoutName && (
          <HeadlineText className="ml-3 truncate text-text-primary" as="h3">
            {wallet.name}
          </HeadlineText>
        )}
        {typeof description === 'string' ? (
          <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
        ) : (
          description
        )}
      </div>

      {children}
    </div>
  );
};
