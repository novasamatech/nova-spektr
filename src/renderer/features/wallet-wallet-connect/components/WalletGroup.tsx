import { memo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { Icon, IconButton } from '@/shared/ui';
import { Accordion, Box } from '@/shared/ui-kit';
import { WalletCardMd, WalletIcon } from '@/entities/wallet';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

// TODO invert this dependency
const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
  onDetailsRequest: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo(({ wallets, walletType, query, title, onSelect, onDetailsRequest }: Props) => {
  const filteredWallets = performSearch({
    query,
    records: wallets,
    weights: { name: 1 },
  });

  if (filteredWallets.length === 0) {
    return null;
  }

  return (
    <Box padding={[1, 0, 0]}>
      <Accordion initialOpen>
        <Accordion.Trigger>
          <WalletIcon type={walletType} />
          <span>{title}</span>
          <span className="text-text-tertiary">{wallets.length}</span>
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map(wallet => (
              <WalletCardMd
                key={wallet.id}
                hideIcon
                wallet={wallet}
                description={
                  <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                }
                prefix={
                  wallet.isActive ? (
                    <Icon name="checkmark" className="shrink-0 text-icon-accent" size={20} />
                  ) : (
                    <div className="row-span-2 h-5 w-5 shrink-0" />
                  )
                }
                onClick={() => onSelect(wallet)}
              >
                <IconButton name="details" onClick={() => onDetailsRequest(wallet)} />
              </WalletCardMd>
            ))}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
