import { useUnit } from 'effector-react';
import { type ComponentProps, memo, useCallback, useEffect } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Graphics, Popover, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { walletSelect } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';
import { walletList } from '../model/list';

export const walletGroupSlot = createSlot<{
  query: string;
  onSelect: (wallet: Wallet) => void;
}>();
export const walletSelectActionsSlot = createSlot();
export const walletIconSlot = createSlot<{ wallet: Wallet; size: number }>();

export const WalletSelect = memo(() => {
  const selectedWallet = useUnit(walletSelect.$selectedWallet);

  useEffect(() => {
    walletList.fetchWallets();
  }, []);

  if (!selectedWallet) {
    return <Skeleton width={52} height={16} />;
  }

  return (
    <Popover align="start" sideOffset={2}>
      <Popover.Trigger>
        <WalletSelectTrigger wallet={selectedWallet} />
      </Popover.Trigger>
      <Popover.Content>
        <WalletSelectDropdown />
      </Popover.Content>
    </Popover>
  );
});

const WalletSelectTrigger = memo(
  ({ wallet, ...rest }: Pick<ComponentProps<'button'>, 'onClick'> & { wallet: Wallet }) => {
    return (
      <button
        type="button"
        data-testid={TEST_IDS.COMMON.WALLET_BUTTON}
        className="w-full rounded-md border border-container-border bg-left-navigation-menu-background shadow-card-shadow"
        {...rest}
      >
        <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={3}>
          <div className="flex h-8 w-full min-w-0 items-center gap-x-2">
            <div className="relative">
              <Slot id={walletIconSlot} props={{ wallet, size: 32 }} />
            </div>
            <div className="flex min-w-0 flex-col">
              <BodyText className="truncate text-text-primary">{wallet.name}</BodyText>
              <WalletFiatBalance wallet={wallet} className="truncate" />
            </div>
          </div>
          <Icon name="down" size={16} className="ml-auto shrink-0" />
        </Box>
      </button>
    );
  },
);

const WalletSelectDropdown = memo(() => {
  const { t } = useI18n();

  const filterQuery = useUnit(walletList.$query);

  const selectWallet = useCallback((wallet: Wallet) => {
    walletSelect.select(wallet.id);
  }, []);

  return (
    <section className="flex h-full max-h-[87vh] min-h-0 w-[300px] flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-divider px-5 py-3">
        <SmallTitleText>{t('wallets.title')}</SmallTitleText>
        <div className="flex items-center gap-2">
          <Slot id={walletSelectActionsSlot} />
        </div>
      </header>

      <div className="border-b border-divider p-2">
        <SearchInput
          value={filterQuery}
          placeholder={t('wallets.searchPlaceholder')}
          onChange={walletList.changeQuery}
        />
      </div>

      <ScrollArea>
        <div className="flex flex-col gap-1 divide-y divide-divider p-1 empty:p-0">
          <Slot
            id={walletGroupSlot}
            props={{
              query: filterQuery,
              onSelect: selectWallet,
            }}
          />
        </div>
        <div className="hidden h-full flex-col items-center justify-center gap-2 p-4 [*:empty~&]:flex">
          <Graphics name="emptyList" size={64} />
          <BodyText className="text-center text-text-tertiary">{t('wallets.emptyList')}</BodyText>
        </div>
      </ScrollArea>
    </section>
  );
});
