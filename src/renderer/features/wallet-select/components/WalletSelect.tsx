import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Wallet } from '@/shared/core';
import { Slot, createSlot, useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Graphics, Popover, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
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
export const walletIconSlot = createSlot<{ wallet: Wallet; size: number }>();

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
            <div className="flex h-8 w-full min-w-0 items-center gap-x-2">
              <div className="relative">
                <Slot id={walletIconSlot} props={{ wallet: activeWallet, size: 32 }} />
              </div>
              <div className="flex min-w-0 flex-col">
                <BodyText className="truncate text-text-primary">{activeWallet.name}</BodyText>
                <WalletFiatBalance walletId={activeWallet.id} className="truncate" />
              </div>
            </div>
            <Icon name="down" size={16} className="ml-auto shrink-0" />
          </Box>
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <section className="flex h-full max-h-[87vh] min-h-0 w-[300px] flex-col overflow-hidden">
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
