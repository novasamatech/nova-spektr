import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Wallet, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch } from '@/shared/lib/utils';
import { Icon, IconButton } from '@/shared/ui';
import { Accordion, Box } from '@/shared/ui-kit';
import { WalletCardMd, WalletIcon } from '@/entities/wallet';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletsModel } from '../model/wallets';

// TODO invert this dependency
const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

type Props = {
  query: string;
  onSelect: (wallet: Wallet) => unknown;
  onDetailsRequest: (wallet: Wallet) => unknown;
};

export const WatchOnlyGroup = memo(({ query, onSelect, onDetailsRequest }: Props) => {
  const { t } = useI18n();
  const wallets = useUnit(walletsModel.$wallets);

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
          <WalletIcon type={WalletType.WATCH_ONLY} />
          <span>{t('wallets.watchOnlyLabel')}</span>
          <span className="text-text-tertiary">{wallets.length}</span>
        </Accordion.Trigger>
        <Accordion.Content>
          <Box gap={1} padding={[1, 0, 0]}>
            {filteredWallets.map(wallet => (
              <WalletCardMd
                key={wallet.id}
                hideIcon
                wallet={wallet}
                description={
                  <WalletFiatBalance walletId={wallet.id} className="max-w-[215px] truncate text-help-text" />
                }
                prefix={
                  wallet.isActive ? (
                    <Icon name="checkmark" className="shrink-0 text-icon-accent" size={20} />
                  ) : (
                    <div className="row-span-2 h-5 w-5 shrink-0" />
                  )
                }
                onClick={() => onSelect(wallet)}
              >
                <IconButton name="details" onClick={() => onDetailsRequest(wallet)} />
              </WalletCardMd>
            ))}
          </Box>
        </Accordion.Content>
      </Accordion>
    </Box>
  );
});
