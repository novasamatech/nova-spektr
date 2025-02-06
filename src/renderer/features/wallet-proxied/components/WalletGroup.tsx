import { memo } from 'react';

import { type Wallet, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Accordion, Box, Tooltip } from '@/shared/ui-kit';
import { WalletIcon } from '@/entities/wallet';

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
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map(wallet => (
              <WalletRow key={wallet.id} wallet={wallet} onSelect={onSelect} />
            ))}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
