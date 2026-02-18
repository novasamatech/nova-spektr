import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { WalletIcon, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box } from '@/shared/ui-kit';
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
        <Box gap={1} padding={[1, 0, 0]}>
          {filteredWallets.map(wallet => {
            const accountId = wallet.accounts[0]?.accountId;

            return (
              <WalletManagement
                key={wallet.id}
                active={selectedWallet === wallet}
                wallet={wallet}
                accountId={accountId ?? null}
                description={<WalletFiatBalance wallet={wallet} className="max-w-[215px] truncate text-help-text" />}
                onClick={() => onSelect(wallet)}
              >
                <Slot id={walletActionsSlot} props={{ wallet }} />
              </WalletManagement>
            );
          })}
        </Box>
      </Accordion.Content>
    </Accordion>
  );
});
