import { type PropsWithChildren, memo } from 'react';

import { type Address as AddresssType, type Chain, type WalletType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AccountExplorers } from '../AccountExplorers/AccountExplorers';
import { Address } from '../Address/Address';
import { WalletAccountIcon } from '../WalletAccountIcon/WalletAccountIcon';

/** Children are rendered as an extra section inside the explorers popover. */
type Props = PropsWithChildren<{
  accountId: AccountId | AddresssType;
  title?: string;
  titleClass?: string;
  chain: Chain | null;
  iconSize?: number;
  hideIcon?: boolean;
  hideAddress?: boolean;
  variant?: 'truncate' | 'short' | 'full';
  walletType?: WalletType;
  addressTestId?: string;
  explorersTestId?: string;
  hideExplorers?: boolean;
}>;

export const Account = memo(
  ({
    accountId,
    title,
    titleClass,
    variant = 'truncate',
    iconSize,
    hideAddress,
    hideIcon,
    chain,
    walletType,
    addressTestId,
    explorersTestId,
    hideExplorers,
    children,
  }: Props) => {
    const address = toAddress(accountId, { prefix: chain?.addressPrefix });
    const showWalletBadge = !hideIcon && walletType !== undefined;

    return (
      <div className="flex w-max max-w-full min-w-0 items-center gap-2">
        {showWalletBadge ? (
          <WalletAccountIcon
            address={address}
            type={walletType}
            size={iconSize ?? 32}
            iconSize={Math.max(12, Math.round((iconSize ?? 32) / 2))}
          />
        ) : null}
        <Address
          showIcon={!hideIcon && !showWalletBadge}
          variant={variant}
          iconSize={iconSize}
          hideAddress={hideAddress}
          title={title}
          titleClass={titleClass}
          address={address}
          testId={addressTestId}
        />
        {!hideExplorers && (
          <AccountExplorers accountId={accountId} chain={chain} testId={explorersTestId}>
            {children}
          </AccountExplorers>
        )}
      </div>
    );
  },
);
