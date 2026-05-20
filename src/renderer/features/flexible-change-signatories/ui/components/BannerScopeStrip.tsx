import { type ReactNode } from 'react';

import { type Address, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, HelpText } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { Copy } from '@/shared/ui-kit';

type Props = {
  wallet: Wallet;
  address: Address;
  action?: ReactNode;
};

const truncate = (address: string) => {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
};

export const BannerScopeStrip = ({ wallet, address, action }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 border-b border-container-border bg-icon-accent/8 px-3 py-2.5">
      <Copy value={address} notification={t('general.notifications.addressCopied')}>
        <button type="button" className="relative shrink-0 cursor-copy">
          <Identicon address={address} canCopy={false} size={28} theme="polkadot" />
          <span className="pointer-events-none absolute -right-0.5 -bottom-0.5">
            <WalletIcon size={12} type={wallet.type} />
          </span>
        </button>
      </Copy>
      <div className="flex min-w-0 flex-1 flex-col">
        <FootnoteText className="truncate font-semibold text-text-primary">{wallet.name}</FootnoteText>
        <HelpText className="truncate text-text-tertiary">{truncate(address)}</HelpText>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};
