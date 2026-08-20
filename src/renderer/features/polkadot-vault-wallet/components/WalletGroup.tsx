import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type PolkadotVaultGroup, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { isEthereumAccountId, nullable, performSearch } from '@/shared/lib/utils';
import { WALLET_MANAGEMENT_ROW_HEIGHT, WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, VirtualList } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletUtils } from '@/entities/wallet';
import { walletSelect, walletSelectService } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';

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
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);
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
        <Box padding={[1, 0, 0]}>
          <VirtualList
            items={filteredWallets}
            estimateSize={WALLET_MANAGEMENT_ROW_HEIGHT}
            gap={4}
            getItemKey={wallet => wallet.id}
          >
            {wallet => {
              if (!walletUtils.isPolkadotVaultGroup(wallet)) return null;

              const isSingleAccount = wallet.accounts.length === 1;
              const accountId = isSingleAccount ? wallet.accounts[0]?.accountId : wallet.rootAccountId;
              if (nullable(accountId)) return null;

              const isEthereum = isEthereumAccountId(accountId);
              const theme = isEthereum ? 'ethereum' : isSingleAccount ? 'polkadot' : 'jdenticon';

              return (
                <WalletManagement
                  active={selectedWalletId === wallet.id}
                  wallet={wallet}
                  accountId={accountId}
                  theme={theme}
                  description={<WalletFiatBalance wallet={wallet} className="max-w-[215px] truncate text-help-text" />}
                  onClick={() => onSelect(wallet)}
                >
                  <Slot id={walletActionsSlot} props={{ wallet }} />
                </WalletManagement>
              );
            }}
          </VirtualList>
        </Box>
      </Accordion.Content>
    </Accordion>
  );
});
