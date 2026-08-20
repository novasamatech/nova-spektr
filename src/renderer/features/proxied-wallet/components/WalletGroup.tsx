import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { WALLET_MANAGEMENT_ROW_HEIGHT, WalletIcon } from '@/shared/ui-entities';
import { Accordion, Box, Tooltip, VirtualList } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelectService } from '@/aggregates/wallet-select';

import { WalletRow } from './WalletRow';

type Props = {
  title: string;
  walletType: WalletType;
  wallets: Wallet[];
  query: string;
  onSelect: (wallet: Wallet) => void;
};

export const WalletGroup = memo(({ wallets, walletType, query, title, onSelect }: Props) => {
  const { t } = useI18n();
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
      weights: { name: 1, allAddresses: 0.8 },
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
        <Tooltip>
          <Tooltip.Trigger>
            <div>
              <Icon name="questionOutline" className="hover:text-icon-hover active:text-icon-active" size={14} />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <span>{t('proxy.tooltipPart1')}</span>
            <br />
            <span>{t('proxy.tooltipPart2')}</span>
          </Tooltip.Content>
        </Tooltip>
      </Accordion.Trigger>
      <Accordion.Content>
        <Box padding={[1, 0, 0]}>
          <VirtualList
            items={filteredWallets}
            estimateSize={WALLET_MANAGEMENT_ROW_HEIGHT}
            gap={4}
            getItemKey={wallet => wallet.id}
          >
            {wallet => <WalletRow wallet={wallet} onSelect={onSelect} />}
          </VirtualList>
        </Box>
      </Accordion.Content>
    </Accordion>
  );
});
