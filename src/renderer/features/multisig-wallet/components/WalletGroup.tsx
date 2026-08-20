import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Chain, type Wallet, type WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { WALLET_MANAGEMENT_ROW_HEIGHT, WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, VirtualList } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect, walletSelectService } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo(({ wallets, walletType, query, title, onSelect }: Props) => {
  const { t } = useI18n();

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
      weights: { name: 1, allAddresses: 0.8 },
    });
  }, [resolvedWallets, query, allAccounts, chains]);

  if (filteredWallets.length === 0) {
    return null;
  }

  const handleWalletClick = (wallet: Wallet) => {
    onSelect(wallet);
  };

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <div className="flex w-full items-center gap-2">
          <WalletIcon type={walletType} />
          <span>{title}</span>
          <span className="ml-auto text-text-tertiary">{filteredWallets.length}</span>
        </div>
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
              const accountId = wallet.accounts.at(0)?.accountId;

              let chain: Chain | null = null;
              let label: string | null = null;

              if (walletUtils.isFlexibleMultisig(wallet)) {
                const flexAccount = wallet.accounts.find(accountUtils.isFlexibleMultisigAccount);
                chain = flexAccount?.chainId ? (chains[flexAccount.chainId] ?? null) : null;

                const flexLabel = t('wallets.flexibleMultisigFlexLabel');
                if (flexAccount && flexAccount.proxyType !== 'Any') {
                  label = `${flexLabel} · ${flexAccount.proxyType}`;
                } else {
                  label = flexLabel;
                }
              }

              return (
                <WalletManagement
                  active={selectedWalletId === wallet.id}
                  wallet={wallet}
                  accountId={accountId ?? null}
                  description={<WalletFiatBalance wallet={wallet} className="max-w-[215px] truncate text-help-text" />}
                  chain={chain}
                  label={label}
                  onClick={() => handleWalletClick(wallet)}
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
