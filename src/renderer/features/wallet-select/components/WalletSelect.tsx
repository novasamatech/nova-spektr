import { useUnit } from 'effector-react';
import { type ComponentProps, memo, useCallback, useEffect } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Icon, SmallTitleText } from '@/shared/ui';
import { Graphics, Popover, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { useWalletName } from '@/domains/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { WalletFiatBalance } from '@/features/wallet-fiat-balance';
import { walletList } from '../model/list';
import { walletSelectUI } from '../model/ui-state';

export const walletGroupSlot = createSlot<{
  query: string;
  onSelect: (wallet: Wallet) => void;
}>();
export const walletSelectActionsSlot = createSlot();
export const walletIconSlot = createSlot<{ wallet: Wallet; size: number }>();

export const WalletSelect = memo(({ folded }: { folded: boolean }) => {
  const selectedWallet = useUnit(walletSelect.$selectedWallet);
  const isOpen = useUnit(walletSelectUI.$isOpen);

  useEffect(() => {
    walletList.fetchWallets();
  }, []);

  if (!selectedWallet) {
    return <Skeleton width={52} height={16} />;
  }

  // Controlled so other features (e.g. wallet-details "View details") can close
  // this Popover when they open a modal that should replace it visually.
  return (
    <Popover
      align="start"
      side={folded ? 'right' : 'bottom'}
      sideOffset={2}
      open={isOpen}
      onToggle={walletSelectUI.toggled}
    >
      <Popover.Trigger>
        <WalletSelectTrigger wallet={selectedWallet} folded={folded} />
      </Popover.Trigger>
      <Popover.Content>
        <WalletSelectDropdown />
      </Popover.Content>
    </Popover>
  );
});

const WalletSelectTrigger = memo(
  ({ wallet, folded, ...rest }: Pick<ComponentProps<'button'>, 'onClick'> & { wallet: Wallet; folded: boolean }) => {
    const walletName = useWalletName(wallet);

    return (
      <button
        type="button"
        data-testid={TEST_IDS.COMMON.WALLET_BUTTON}
        className={cnTw(
          'w-full cursor-pointer rounded-md border py-3 transition-all duration-200',
          folded
            ? 'border-transparent px-1'
            : 'border-container-border bg-left-navigation-menu-background px-3 shadow-card-shadow',
        )}
        {...rest}
      >
        <div className="flex h-8 items-center gap-x-2">
          <div className={cnTw('relative shrink-0', folded && 'pointer-events-none')}>
            <Slot id={walletIconSlot} props={{ wallet, size: 32 }} />
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden">
            <BodyText className="whitespace-nowrap text-text-primary">{walletName}</BodyText>
            <WalletFiatBalance wallet={wallet} className="whitespace-nowrap" />
          </div>
          <Icon name="down" size={16} className="ml-auto shrink-0" />
        </div>
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
    <section className="flex h-full max-h-[87vh] min-h-0 w-[325px] flex-col overflow-hidden">
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
          data-testid={TEST_IDS.WALLET_MANAGEMENT.WALLET_SEARCH}
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
