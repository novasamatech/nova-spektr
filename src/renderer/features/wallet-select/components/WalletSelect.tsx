import { useUnit } from 'effector-react';
import { useNavigate } from 'react-router-dom';

import { TEST_IDS } from '@/shared/constants';
import { type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText, Icon, SmallTitleText } from '@/shared/ui';
import { Box, Graphics, Popover, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { walletSelect } from '@/aggregates/wallet-select';
import { walletsFiatBalanceFeature } from '@/features/wallet-fiat-balance';
import { walletList } from '../model/list';

const {
  views: { WalletFiatBalance },
} = walletsFiatBalanceFeature;

export const walletGroupSlot = createSlot<{
  query: string;
  onSelect: (wallet: Wallet) => void;
}>();
export const walletSelectActionsSlot = createSlot();
export const walletIconSlot = createSlot<{ wallet: Wallet; size: number }>();

export const WalletSelect = () => {
  const { t } = useI18n();

  const navigate = useNavigate();

  const selectedWallet = useUnit(walletSelect.$selectedWallet);
  const filterQuery = useUnit(walletList.$query);

  if (!selectedWallet) {
    return <Skeleton width={52} height={16} />;
  }

  return (
    <Popover align="start" sideOffset={2}>
      <Popover.Trigger>
        <button
          type="button"
          data-testid={TEST_IDS.COMMON.WALLET_BUTTON}
          className="border-container-border bg-left-navigation-menu-background shadow-card-shadow w-full rounded-md border"
        >
          <Box direction="row" verticalAlign="center" horizontalAlign="space-between" padding={3}>
            <div className="flex h-8 w-full min-w-0 items-center gap-x-2">
              <div className="relative">
                <Slot id={walletIconSlot} props={{ wallet: selectedWallet, size: 32 }} />
              </div>
              <div className="flex min-w-0 flex-col">
                <BodyText className="text-text-primary truncate">{selectedWallet.name}</BodyText>
                <WalletFiatBalance walletId={selectedWallet.id} className="truncate" />
              </div>
            </div>
            <Icon name="down" size={16} className="ml-auto shrink-0" />
          </Box>
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <section className="flex h-full max-h-[87vh] min-h-0 w-[300px] flex-col overflow-hidden">
          <header className="border-divider flex items-center justify-between border-b px-5 py-3">
            <SmallTitleText>{t('wallets.title')}</SmallTitleText>
            <div>
              <Slot id={walletSelectActionsSlot} />
            </div>
          </header>

          <div className="border-divider border-b p-2">
            <SearchInput
              value={filterQuery}
              placeholder={t('wallets.searchPlaceholder')}
              onChange={walletList.changeQuery}
            />
          </div>

          <ScrollArea>
            <div className="divide-divider flex flex-col gap-1 divide-y px-1 pb-1 empty:p-0">
              <Slot
                id={walletGroupSlot}
                props={{
                  query: filterQuery,
                  onSelect: ({ id }) => {
                    walletSelect.select(id);
                    navigate(Paths.ASSETS);
                  },
                }}
              />
            </div>
            <div className="hidden h-full flex-col items-center justify-center gap-2 p-4 [*:empty~&]:flex">
              <Graphics name="emptyList" size={64} />
              <BodyText className="text-text-tertiary text-center">{t('wallets.emptyList')}</BodyText>
            </div>
          </ScrollArea>
        </section>
      </Popover.Content>
    </Popover>
  );
};
