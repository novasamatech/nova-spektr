import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { WalletIcon } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelectService } from '@/aggregates/wallet-select';

import { WalletRow } from './WalletRow';

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo(({ wallets, walletType, query, title, onSelect }: Props) => {
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  const resolvedWallets = useWalletsNames(wallets);

  const filteredWallets = useMemo(() => {
    return performSearch({
      query,
      records: resolvedWallets,
      getMeta: wallet => ({
        allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
      }),
      weights: {
        name: 1,
        allAddresses: 0.8,
      },
    });
  }, [resolvedWallets, query, allAccounts, chains]);

  if (filteredWallets.length === 0) {
    return null;
  }

  return (
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
  );
});
