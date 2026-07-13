import { useUnit } from 'effector-react';
import { memo } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText, Loader, Separator, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { currencySelect } from '@/aggregates/currency-select';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance, FiatBalance } from '@/widgets/price';
import { type WalletVesting } from '../hooks/useWalletVesting';
import { modalModel } from '../model/modal-model';

type Props = {
  vesting: WalletVesting;
  chains: Record<ChainId, Chain>;
};

export const VestingScheduleModal = memo(({ vesting, chains }: Props) => {
  const { t } = useI18n();

  const isOpen = useUnit(modalModel.$scheduleModalOpen);
  // AssetFiatBalance renders nothing when fiat is off — gate the separators too, or they'd dangle.
  const fiatFlag = useUnit(currencySelect.$fiatFlag);

  const { summary, accountViews, loadingMore } = vesting;

  return (
    <Modal isOpen={isOpen} size="lg" height="fit" onToggle={(open) => !open && modalModel.scheduleModalClosed()}>
      <Modal.Title close>{t('vesting.schedule.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-y-4 p-5">
          <div className="flex w-fit items-center gap-x-5 rounded-lg bg-block-background p-4">
            <div className="flex flex-col gap-y-1.5">
              <HelpText className="whitespace-nowrap text-text-tertiary">{t('vesting.schedule.totalVesting')}</HelpText>
              <FiatBalance
                amount={summary.totalVestingFiat.toFixed(2)}
                className="text-small-title font-bold text-text-primary"
              />
            </div>
            <Separator vertical className="h-8" />
            <div className="flex flex-col gap-y-1.5">
              <HelpText className="whitespace-nowrap text-text-tertiary">
                {t('vesting.schedule.activeSchedules')}
              </HelpText>
              <SmallTitleText className="font-bold text-text-primary">{summary.schedulesCount}</SmallTitleText>
            </div>
            {summary.hasClaim && (
              <>
                <Separator vertical className="h-8" />
                <div className="flex flex-col gap-y-1.5">
                  <HelpText className="whitespace-nowrap text-text-tertiary">
                    {t('vesting.schedule.readyToUnlock')}
                  </HelpText>
                  <FiatBalance
                    amount={summary.claimableFiat.toFixed(2)}
                    className="text-small-title font-bold text-text-primary"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-y-1.5">
            <HelpText className="text-text-tertiary">{t('vesting.schedule.averageUnlockRate')}</HelpText>
            <div className="flex items-baseline gap-x-1">
              <FiatBalance amount={summary.perDayFiat.toFixed(2)} className="text-small-title" />
              <FootnoteText className="text-text-tertiary">{t('vesting.schedule.unlockingPerDay')}</FootnoteText>
            </div>
          </div>

          <div className="flex flex-col gap-y-3">
            {accountViews.map((view) => {
              const chain = chains[view.chainId as ChainId];
              const asset = chain ? getNativeAsset(chain.assets) : undefined;
              const perDay = view.perDayRate;
              const hasRate = perDay ? perDay.gtn(0) : false;
              const hasReady = view.claimable.gtn(0);
              const showFiat = Boolean(fiatFlag);
              // "Unlocking" while tokens are still vesting; "Unlocked" once the whole amount has vested.
              const stillVesting = !view.stillLocked.isZero();
              // A finished schedule with a pending claim says "Ready to claim" only — "Unlocked" adds nothing there.
              const showStatus = stillVesting || !hasReady;
              // The rate's "per day" lives in the label, so `/` can pair each amount with its fiat value.
              const statusLabel = !stillVesting
                ? t('vesting.schedule.unlocked')
                : hasRate
                  ? t('vesting.schedule.unlockingPerDayLabel')
                  : t('vesting.schedule.unlocking');

              return (
                <div key={view.key} className="rounded-xl border border-divider p-4">
                  <div className="flex items-center justify-between gap-x-3">
                    <NamedAccount accountId={view.account.accountId} chain={chain} variant="full" />
                    <div className="flex flex-col items-end">
                      <AssetBalance value={view.stillLocked.toString()} asset={asset} showSymbol />
                      {asset && <AssetFiatBalance asset={asset} amount={view.stillLocked.toString()} />}
                    </div>
                  </div>
                  <Separator className="my-3 border-divider" />
                  <div className="flex items-center justify-between gap-x-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-footnote text-text-secondary">
                      {showStatus && <span className="text-text-tertiary">{statusLabel}</span>}
                      {perDay && hasRate && (
                        <>
                          <Approx />
                          <AssetBalance value={perDay} asset={asset} showSymbol />
                          {asset && showFiat && (
                            <>
                              <Slash />
                              <AssetFiatBalance
                                asset={asset}
                                amount={perDay.toString()}
                                className="text-body text-text-primary"
                              />
                            </>
                          )}
                        </>
                      )}
                      {hasReady && (
                        <>
                          {hasRate && <MidDot />}
                          <span className="text-text-tertiary">{t('vesting.schedule.readyShort')}</span>
                          <AssetBalance value={view.claimable} asset={asset} showSymbol />
                          {asset && showFiat && (
                            <>
                              <Slash />
                              <AssetFiatBalance
                                asset={asset}
                                amount={view.claimable.toString()}
                                className="text-body text-text-primary"
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <Button size="sm" variant="text" onClick={() => modalModel.accountOpened(view.key)}>
                      {t('vesting.schedule.seeSchedule')}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* More chains/accounts are still loading — new rows may appear below. */}
            {loadingMore && (
              <div className="flex items-center justify-center gap-x-2 py-2">
                <Loader color="primary" size={16} />
                <FootnoteText className="text-text-tertiary">{t('vesting.schedule.loadingMore')}</FootnoteText>
              </div>
            )}
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
});

// Non-translatable punctuation used to compose the unlocking summary line.
const Approx = () => <span className="text-text-tertiary">≈</span>;
const Slash = () => <span className="text-text-tertiary">/</span>;
const MidDot = () => <span className="text-text-tertiary">·</span>;
