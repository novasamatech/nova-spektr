import { memo } from 'react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { Icon, type IconNames } from '@/shared/ui';
import { WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Label } from '@/shared/ui-kit';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

// TODO invert this dependency
const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

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
          <Icon name={icon} size={20} />
          <span>{title}</span>
          <span className="text-text-tertiary">{wallets.length}</span>
          <Label variant="blue">{t('onboarding.extension.beta')}</Label>
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map((wallet) => (
              <WalletManagement
                key={wallet.id}
                wallet={wallet}
                address={wallet.accounts[0].accountId}
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
