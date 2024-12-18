import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useState } from 'react';

import { type Wallet, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Icon, SmallTitleText } from '@/shared/ui';
import { Box, Popover, SearchInput, Skeleton } from '@/shared/ui-kit';
import { WalletCardLg, walletModel } from '@/entities/wallet';
import { walletDetailsFeature } from '@/features/wallet-details';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletSelectModel } from '../model/wallet-select-model';

import { WalletGroup } from './WalletGroup';

const {
  views: { WalletDetails },
} = walletDetailsFeature;

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

type Props = {
  action?: ReactNode;
};

export const WalletSelect = ({ action }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const filterQuery = useUnit(walletSelectModel.$filterQuery);
  const filteredWalletGroups = useUnit(walletSelectModel.$filteredWalletGroups);

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    // TODO: WTF
    walletSelectModel.events.callbacksChanged({ onClose: walletSelectModel.events.clearData });
  }, []);

  if (!activeWallet) {
    return <Skeleton width={52} height={14} />;
  }

  return (
    <>
      <Popover align="start" sideOffset={2}>
        <Popover.Trigger>
          <button
            type="button"
            className="w-full rounded-md border border-container-border bg-left-navigation-menu-background shadow-card-shadow"
          >
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={3}>
              <WalletCardLg
                wallet={activeWallet}
                description={<WalletFiatBalance walletId={activeWallet.id} className="truncate" />}
              />
              <Icon name="down" size={16} className="ml-auto shrink-0" />
            </Box>
          </button>
        </Popover.Trigger>

        <Popover.Content>
          <section className="relative flex max-h-[700px] w-[300px] flex-col bg-card-background">
            <header className="flex items-center justify-between border-b border-divider px-5 py-3">
              <SmallTitleText>{t('wallets.title')}</SmallTitleText>
              <div className="min-w-[140px]">{action}</div>
            </header>

            <div className="border-b border-divider p-2">
              <SearchInput
                value={filterQuery}
                placeholder={t('wallets.searchPlaceholder')}
                onChange={walletSelectModel.events.queryChanged}
              />
            </div>

            <div className="flex max-h-[530px] flex-col divide-y divide-divider overflow-y-auto px-1">
              {Object.entries(filteredWalletGroups).map(([walletType, wallets]) => {
                if (wallets.length === 0) {
                  return null;
                }

                return (
                  <WalletGroup
                    key={walletType}
                    type={walletType as WalletFamily}
                    wallets={wallets}
                    onInfoClick={setSelectedWallet}
                  />
                );
              })}
            </div>
          </section>
        </Popover.Content>
      </Popover>
      <WalletDetails isOpen={selectedWallet !== null} wallet={selectedWallet} onClose={() => setSelectedWallet(null)} />
    </>
  );
};
