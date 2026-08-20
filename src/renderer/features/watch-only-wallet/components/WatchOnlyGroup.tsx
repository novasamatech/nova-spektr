import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { WALLET_MANAGEMENT_ROW_HEIGHT, WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, VirtualList } from '@/shared/ui-kit';
import { useWalletsNames } from '@/domains/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';
import { walletsModel } from '../model/wallets';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WatchOnlyGroup = memo(({ query, onSelect }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletsModel.$wallets);
  const selectedWallet = useUnit(walletSelect.$selectedWallet);

  const resolvedWallets = useWalletsNames(wallets);

  const filteredWallets = useMemo(() => {
    return performSearch({
      query,
      records: resolvedWallets,
      weights: { name: 1 },
    });
  }, [resolvedWallets, query]);

  if (filteredWallets.length === 0) {
    return null;
  }

  return (
    <Accordion initialOpen>
      <Accordion.Trigger>
        <WalletIcon type={WalletType.WATCH_ONLY} />
        <span>{t('wallets.watchOnlyLabel')}</span>
        <span className="text-text-tertiary">{wallets.length}</span>
      </Accordion.Trigger>
      <Accordion.Content>
        <Box padding={[1, 0, 0]}>
          <VirtualList
            items={filteredWallets}
            estimateSize={WALLET_MANAGEMENT_ROW_HEIGHT}
            gap={1}
            getItemKey={wallet => wallet.id}
          >
            {wallet => {
              const accountId = wallet.accounts[0]?.accountId;

              return (
                <WalletManagement
                  active={selectedWallet?.id === wallet.id}
                  wallet={wallet}
                  accountId={accountId ?? null}
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
