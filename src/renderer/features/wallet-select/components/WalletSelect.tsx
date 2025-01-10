import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Wallet } from '@/shared/core';
import { createSlot, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Graphics, Popover, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { WalletCardLg, walletModel } from '@/entities/wallet';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletSelectModel } from '../model/wallet-select-model';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletGroupSlot = createSlot<{
  query: string;
  onSelect: (wallet: Wallet) => void;
  onDetailsRequest: (wallet: Wallet) => void;
}>();
export const walletSelectActionsSlot = createSlot();

export const WalletSelect = () => {
  const { t } = useI18n();
  const activeWallet = useUnit(walletModel.$activeWallet);
  const filterQuery = useUnit(walletSelectModel.$filterQuery);

  const actions = useSlot(walletSelectActionsSlot);
  const walletGroups = useSlot(walletGroupSlot, {
    props: {
      query: filterQuery,
      onSelect: w => walletSelectModel.events.walletSelected(w.id),
      onDetailsRequest: () => console.error('No details'),
    },
  });

  useEffect(() => {
    // TODO: WTF
    walletSelectModel.events.callbacksChanged({ onClose: walletSelectModel.events.clearData });
  }, []);

  if (!activeWallet) {
    return <Skeleton width={52} height={16} />;
  }

  return (
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
        <section className="relative flex max-h-[800px] w-[300px] flex-col overflow-hidden bg-card-background">
          <header className="flex items-center justify-between border-b border-divider px-5 py-3">
            <SmallTitleText>{t('wallets.title')}</SmallTitleText>
            <div className="min-w-[140px]">{actions}</div>
          </header>

          <div className="border-b border-divider p-2">
            <SearchInput
              value={filterQuery}
              placeholder={t('wallets.searchPlaceholder')}
              onChange={walletSelectModel.events.queryChanged}
            />
          </div>

          <ScrollArea>
            <div className="flex flex-col gap-1 divide-y divide-divider px-1 pb-1 empty:p-0">{walletGroups}</div>
            <div className="hidden h-full flex-col items-center justify-center gap-2 p-4 [*:empty~&]:flex">
              <Graphics name="emptyList" size={64} />
              <BodyText className="text-center text-text-tertiary">{t('wallets.emptyList')}</BodyText>
            </div>
          </ScrollArea>
        </section>
      </Popover.Content>
    </Popover>
  );
};
