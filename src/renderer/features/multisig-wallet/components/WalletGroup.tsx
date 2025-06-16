import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { isEthereumAccountId, performSearch } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { type IconTheme, WalletManagement } from '@/shared/ui-entities';
import { Accordion, Box, Tooltip } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { WalletIcon } from '@/entities/wallet';
import { walletSelectService } from '@/aggregates/wallet-select';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';

const { WalletFiatBalance } = walletsFiatBalanceFeature.views;

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
  const chains = useUnit(networkModel.$chains);

  const filteredWallets = performSearch({
    query,
    records: wallets,
    getMeta: wallet => ({
      allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
    }),
    weights: { name: 1, allAddresses: 0.8 },
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
          {walletType === WalletType.FLEXIBLE_MULTISIG ? (
            <Tooltip>
              <Tooltip.Trigger>
                <div>
                  <Icon name="questionOutline" size={16} />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('createMultisigAccount.flexibleMultisig.description')}</Tooltip.Content>
            </Tooltip>
          ) : null}
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map(wallet => {
              const address = wallet.accounts[0]?.accountId;
              const isEthereum = isEthereumAccountId(address);
              const theme: IconTheme = isEthereum ? 'ethereum' : 'polkadot';

              return (
                <WalletManagement
                  key={wallet.id}
                  wallet={wallet}
                  theme={theme}
                  address={address}
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
