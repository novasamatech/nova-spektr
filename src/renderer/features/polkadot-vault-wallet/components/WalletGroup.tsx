import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type PolkadotVaultGroup, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { isEthereumAccountId, nullable, performSearch } from '@/shared/lib/utils';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { WalletIcon } from '@/entities/wallet';
import { walletSelectService } from '@/aggregates/wallet-select';
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
  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  const filteredWallets = performSearch({
    query,
    records: wallets,
    getMeta: wallet => ({
      allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
    }),
    weights: {
      name: 1,
      allAddresses: 0.8,
    },
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
            {filteredWallets.map(wallet => {
              const isSingleAccount = wallet.accounts.length === 1;
              const address = isSingleAccount ? wallet.accounts[0]?.accountId : wallet.rootAccountId;
              if (nullable(address)) return null;

              const isEthereum = isEthereumAccountId(address);
              const theme = isEthereum ? 'ethereum' : isSingleAccount ? 'polkadot' : 'jdenticon';

              return (
                <WalletManagement
                  key={wallet.id}
                  wallet={wallet}
                  address={address}
                  theme={theme}
                  description={
                    <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                  }
                  onClick={() => onSelect(wallet)}
                >
                  <Slot id={walletActionsSlot} props={{ wallet }} />
                </WalletManagement>
              );
            })}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
