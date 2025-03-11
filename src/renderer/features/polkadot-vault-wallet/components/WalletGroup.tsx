import { memo } from 'react';

import { type PolkadotVaultGroup, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { performSearch } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

// TODO invert this dependency
const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  title: string;
  walletType: WalletType;
  wallets: PolkadotVaultGroup[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo(({ wallets, walletType, query, title, onSelect }: Props) => {
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
              <WalletManagement
                key={wallet.id}
                wallet={wallet}
                address={wallet.rootAccountId}
                isMultishard={wallet.accounts.length > 1}
                description={
                  <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                }
                onClick={() => onSelect(wallet)}
              >
                <Slot id={walletActionsSlot} props={{ wallet }} />
              </WalletManagement>
            ))}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
