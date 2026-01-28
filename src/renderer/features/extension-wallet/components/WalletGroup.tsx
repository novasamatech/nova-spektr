import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { type IconNames, Icon } from '@/shared/ui';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Label } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelect, walletSelectService } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';

export const walletActionsSlot = createSlot<{ wallet: Wallet }>();

type Props = {
  title: string;
  icon: IconNames;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => unknown;
};

export const WalletGroup = memo(({ wallets, icon, query, title, onSelect }: Props) => {
  const { t } = useI18n();
  const allAccounts = useUnit(accounts.$list);
  const selectedWalletId = useUnit(walletSelect.$selectedWalletId);
  const chains = useUnit(networkModel.$chains);

  const resolvedWallets = useWalletsNames(wallets);

  const filteredWallets = useMemo(() => {
    return performSearch({
      query,
      records: resolvedWallets,
      getMeta: (wallet) => ({
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
        <Icon name={icon} size={20} />
        <span>{title}</span>
        <span className="text-text-tertiary">{wallets.length}</span>
        <Label variant="blue">{t('onboarding.extension.beta')}</Label>
      </Accordion.Trigger>
      <Accordion.Content>
        <Box gap={1} padding={[1, 0, 0]}>
          {filteredWallets.map((wallet) => {
            const accountId = wallet.accounts[0]?.accountId;

            return (
              <WalletManagement
                key={wallet.id}
                active={selectedWalletId === wallet.id}
                wallet={wallet}
                accountId={accountId}
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
