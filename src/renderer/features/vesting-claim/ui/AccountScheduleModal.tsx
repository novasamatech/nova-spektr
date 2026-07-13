import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText, Separator, SmallTitleText } from '@/shared/ui';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Modal, Tooltip } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type AccountVestingView, type ClaimBlockReason, vestingPortfolioModel } from '@/aggregates/vesting-portfolio';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { type ClaimRequest, claimModel } from '../model/claim';
import { modalModel } from '../model/modal-model';

const CLAIM_BLOCK_HINT: Record<ClaimBlockReason, string> = {
  'chain-unsupported': 'vesting.account.cantClaimChainUnsupported',
  'watch-only': 'vesting.account.cantClaimWatchOnly',
  'no-signer': 'vesting.account.cantClaimNoSigner',
  'no-local-account': 'vesting.account.cantClaimNotYours',
};

export const AccountScheduleModal = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const accountViews = useUnit(vestingPortfolioModel.$accountViews);
  const openKey = useUnit(modalModel.$openAccountKey);
  const view = accountViews.find((v) => v.key === openKey) ?? null;

  // AssetFiatBalance renders nothing when fiat is off — gate the separators too, or they'd dangle.
  const showFiat = Boolean(useUnit(currencySelect.$fiatFlag));

  const chain = view ? chains[view.chainId as ChainId] : undefined;
  const asset = chain ? getNativeAsset(chain.assets) : undefined;

  const formatToken = (value: BN) => {
    const { value: amount, suffix } = formatBalance(value.toString(), asset?.precision ?? 0);
    return `${amount}${suffix}${asset?.symbol ? ` ${asset.symbol}` : ''}`;
  };

  // Claiming is per account: one `vesting.vest()` releases every vested schedule
  // for that account, so a claim is always a single-account request.
  const handleClaim = (target: AccountVestingView) => {
    const targetChain = chains[target.chainId as ChainId];
    if (!targetChain || !target.claimable_signable || !target.claimable.gtn(0)) return;

    const request: ClaimRequest = {
      chain: targetChain,
      initiator: target.account,
      claimable: target.claimable,
      stillLocked: target.stillLocked,
    };
    claimModel.claimStarted([request]);
  };

  return (
    <Modal isOpen={Boolean(view)} size="lg" height="fit" onToggle={(open) => !open && modalModel.accountClosed()}>
      <Modal.Title close>{t('vesting.account.title')}</Modal.Title>
      <Modal.Content>
        {view && (
          <div className="flex flex-col gap-y-4 p-5">
            <NamedAccount accountId={view.account.accountId} chain={chain} variant="full" />

            <div className="flex items-center gap-x-4 rounded-lg bg-block-background p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-y-1.5">
                <HelpText className="whitespace-nowrap text-text-tertiary">
                  {t('vesting.schedule.totalVesting')}
                </HelpText>
                <AssetBalance
                  value={view.stillLocked.toString()}
                  asset={asset}
                  showSymbol
                  className="text-small-title font-bold text-text-primary"
                />
                {asset && <AssetFiatBalance asset={asset} amount={view.stillLocked.toString()} />}
              </div>
              <Separator vertical className="h-8" />
              {/* One line shorter than its neighbours (no fiat row) — opt out of `items-center` so headers align. */}
              <div className="flex shrink-0 flex-col gap-y-1.5 self-start">
                <HelpText className="whitespace-nowrap text-text-tertiary">
                  {t('vesting.schedule.activeSchedules')}
                </HelpText>
                <SmallTitleText className="font-bold text-text-primary">{view.schedules.length}</SmallTitleText>
              </div>
              {view.claimable.gtn(0) && (
                <>
                  <Separator vertical className="h-8" />
                  <div className="flex min-w-0 flex-1 flex-col gap-y-1.5">
                    <HelpText className="whitespace-nowrap text-text-tertiary">
                      {t('vesting.schedule.readyToUnlock')}
                    </HelpText>
                    <AssetBalance
                      value={view.claimable.toString()}
                      asset={asset}
                      showSymbol
                      className="text-small-title font-bold text-text-primary"
                    />
                    {asset && <AssetFiatBalance asset={asset} amount={view.claimable.toString()} />}
                  </div>
                </>
              )}
              {/* Tokens have vested, but nothing here can sign the claim — keep the button
                  and explain on hover, rather than silently dropping it. */}
              {view.claimable.gtn(0) && (
                <Tooltip open={nonNullable(view.claimBlockReason) ? undefined : false}>
                  <Tooltip.Trigger>
                    {/* A disabled button swallows pointer events — the wrapper keeps the tooltip reachable. */}
                    <div className="ml-auto shrink-0">
                      <Button
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={!view.claimable_signable}
                        onClick={() => handleClaim(view)}
                      >
                        {t('vesting.account.claimAll')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {nonNullable(view.claimBlockReason) && t(CLAIM_BLOCK_HINT[view.claimBlockReason])}
                  </Tooltip.Content>
                </Tooltip>
              )}
            </div>

            {asset && view.perDayRate?.gtn(0) && (
              <div className="flex items-center gap-x-1 text-footnote text-text-tertiary">
                <span>{t('vesting.schedule.unlocking')}</span>
                <Approx />
                <AssetFiatBalance asset={asset} amount={view.perDayRate.toString()} />
                <span>{t('vesting.account.perDayLong')}</span>
              </div>
            )}

            <div className="flex flex-col gap-y-3">
              {view.schedules.map((schedule) => {
                const pct = schedule.locked.isZero()
                  ? 0
                  : new BigNumber(schedule.vestedSoFar.toString())
                      .div(schedule.locked.toString())
                      .multipliedBy(100)
                      .toNumber();

                const fullyVested = schedule.lockedNow.isZero();
                const hasReady = schedule.claimableNow.gtn(0);
                const daysLeft = schedule.fullyUnlocksAt
                  ? Math.max(1, Math.ceil((schedule.fullyUnlocksAt.getTime() - Date.now()) / DAY_MS))
                  : null;

                return (
                  <div key={schedule.index} className="rounded-xl border border-divider p-4">
                    <div className="flex items-center justify-between gap-x-3">
                      <div className="flex min-w-0 items-center gap-x-2">
                        {asset && <AssetIcon asset={asset} size={32} />}
                        <div className="flex min-w-0 flex-col">
                          <FootnoteText>
                            {t('vesting.account.scheduleLabel', { index: schedule.index, symbol: asset?.symbol ?? '' })}
                          </FootnoteText>
                          {schedule.perDayRate && (
                            <div className="flex items-center gap-x-1 text-help-text text-text-tertiary">
                              <span>{t('vesting.schedule.unlockingPerDayLabel')}</span>
                              <Approx />
                              <AssetBalance
                                value={schedule.perDayRate}
                                asset={asset}
                                showSymbol
                                className="text-help-text text-text-tertiary"
                              />
                              {asset && showFiat && (
                                <>
                                  <Slash />
                                  <AssetFiatBalance
                                    asset={asset}
                                    amount={schedule.perDayRate.toString()}
                                    className="text-help-text text-text-tertiary"
                                  />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <AssetBalance value={schedule.locked.toString()} asset={asset} showSymbol />
                        {asset && <AssetFiatBalance asset={asset} amount={schedule.locked.toString()} />}
                      </div>
                    </div>

                    <div className="bg-input-border-disabled mt-3 flex h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-icon-accent transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-x-3">
                      <HelpText className="text-text-tertiary">
                        {t('vesting.account.unlockedOf', {
                          unlocked: formatToken(schedule.vestedSoFar),
                          total: formatToken(schedule.locked),
                        })}
                      </HelpText>
                      {fullyVested ? (
                        <HelpText className="text-text-tertiary">{t('vesting.account.fullyUnlocked')}</HelpText>
                      ) : schedule.fullyUnlocksAt && daysLeft != null ? (
                        <HelpText className="text-text-tertiary">
                          {t('vesting.account.fullyUnlocksOn', {
                            date: formatDate(schedule.fullyUnlocksAt),
                            days: daysLeft,
                          })}
                        </HelpText>
                      ) : schedule.inCliff ? (
                        <HelpText className="text-text-tertiary">{t('vesting.account.inCliff')}</HelpText>
                      ) : (
                        <HelpText className="text-text-tertiary">{t('vesting.account.vesting')}</HelpText>
                      )}
                    </div>

                    {schedule.inCliff ? (
                      <>
                        <Separator className="my-3 border-divider" />
                        <HelpText className="text-text-tertiary">
                          {schedule.cliffEndsAt
                            ? t('vesting.account.cliffUntil', { date: formatDate(schedule.cliffEndsAt) })
                            : t('vesting.account.inCliff')}
                        </HelpText>
                      </>
                    ) : (
                      hasReady && (
                        <>
                          <Separator className="my-3 border-divider" />
                          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-footnote text-text-primary">
                            <span className="text-text-tertiary">{t('vesting.account.readyToClaim')}</span>
                            <AssetBalance value={schedule.claimableNow} asset={asset} showSymbol />
                            {asset && showFiat && (
                              <>
                                <Slash />
                                <AssetFiatBalance
                                  asset={asset}
                                  amount={schedule.claimableNow.toString()}
                                  className="text-body text-text-primary"
                                />
                              </>
                            )}
                          </div>
                        </>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal.Content>
    </Modal>
  );
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "28 Feb 2026" — same format the vesting callout uses for the unlock date.
const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// Non-translatable punctuation used to compose the unlock-rate lines.
const Approx = () => <span className="text-text-tertiary">≈</span>;
const Slash = () => <span className="text-text-tertiary">/</span>;
