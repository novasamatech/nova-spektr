import { memo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { Accordion, Box } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';

import { WalletRow } from './WalletRow';

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
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
              <WalletRow key={wallet.id} wallet={wallet} onSelect={onSelect} />
            ))}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
