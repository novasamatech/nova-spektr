import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';
import { BodyText, Button, CaptionText, FootnoteText, Icon } from '@/shared/ui';
import { AssetBalance, ChainIcon } from '@/shared/ui-entities';
import { Drawer, Label, Tooltip } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { useNominationRows } from '../hooks/useNominationRows';
import { useUnclaimedRewards } from '../hooks/useUnclaimedRewards';
import { type PositionRow, getUnbondingCountdown } from '../lib';
import { type PositionAction, positionActions } from '../model/position-actions';

import { NominationsTable } from './NominationsTable';
import { PositionStatusPill } from './PositionStatusPill';
import { toSigningMode } from './signing-mode';

type Props = {
  row: PositionRow | null;
  onClose: () => void;
};

const StatCell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-y-0.5">
    <CaptionText className="text-text-tertiary">{label}</CaptionText>
    <div className="flex min-h-6 items-center">{children}</div>
  </div>
);

/**
 * Everything about one position, on one surface.
 *
 * The table answers "which of my positions needs attention"; this answers "what
 * exactly is wrong with this one and what can I do about it". So the stats grid
 * repeats the row's columns on purpose — the user arrived by clicking one of
 * them and must not have to remember which.
 */
export const PositionDetailDrawer = ({ row, onClose }: Props) => {
  const { t, formatDate } = useI18n();
  const wiredActions = useUnit(positionActions.$wiredActions);
  const unclaimed = useUnclaimedRewards(row?.chain ?? null, row?.accountId ?? null);
  const { rows: nominationRows, counts } = useNominationRows(row?.position ?? null);

  const nowMs = useMemo(() => Date.now(), [row?.id]);

  const isOpen = row !== null;
  const watchOnly = row?.accessMode === 'watchOnly';
  const hasUnclaimed = !new BN(unclaimed.total).isZero();

  // The chip names the amount it will claim, so the user does not have to look
  // back up at the grid to know what they are about to sign for.
  const claimLabelAmount = useMemo(() => {
    if (!row || !hasUnclaimed) return '';

    const { formatted, suffix } = formatBalance(unclaimed.total, row.asset.precision);

    return `${formatted}${suffix} ${row.asset.symbol}`;
  }, [row, unclaimed.total, hasUnclaimed]);

  // Soonest chunk first, so the strip talks about the next thing to happen.
  const nextChunk = row?.position.unbonding.at(0) ?? null;
  const countdown = getUnbondingCountdown(nextChunk?.unlockEstimateMs ?? null, nowMs);

  const actionPayload = row
    ? {
        position: row.position,
        chain: row.chain,
        asset: row.asset,
        account: row.account,
        wallet: row.wallet,
        signingMode: toSigningMode(row.accessMode),
      }
    : null;

  const renderAction = (
    action: PositionAction,
    label: string,
    onClick: () => void,
    primary = false,
    blockedHint?: string,
  ) => {
    const disabled = !wiredActions.includes(action) || Boolean(blockedHint);

    return (
      <Tooltip open={disabled ? undefined : false}>
        <Tooltip.Trigger>
          <div>
            <Button
              size="sm"
              variant={primary ? 'fill' : 'chip'}
              pallet={primary ? 'primary' : 'secondary'}
              disabled={disabled}
              onClick={onClick}
            >
              {label}
            </Button>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{blockedHint ?? t('dashboard.staking.positions.detail.actions.notWired')}</Tooltip.Content>
      </Tooltip>
    );
  };

  return (
    <Drawer
      isOpen={isOpen}
      width={560}
      onToggle={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Title close>{t('dashboard.staking.positions.title')}</Drawer.Title>

      <Drawer.Content>
        {row && actionPayload ? (
          <div className="flex flex-col gap-y-5 px-5 pt-1 pb-5">
            {/* --- who --- */}
            <div className="flex flex-col gap-y-1">
              <div className="flex items-center gap-x-2">
                <NamedAccount
                  accountId={row.accountId}
                  chain={row.chain}
                  wallet={row.wallet}
                  variant="short"
                  iconSize={32}
                />
                <Label variant={watchOnly ? 'gray' : 'green'}>
                  {watchOnly ? t('dashboard.staking.positions.viewOnly') : t('dashboard.staking.positions.localWallet')}
                </Label>
              </div>

              <div className="flex items-center gap-x-1.5 ps-10">
                <div className="h-[13px] w-[13px] shrink-0">
                  <ChainIcon chain={row.chain} size={13} />
                </div>
                <CaptionText className="text-text-tertiary">{row.chain.name}</CaptionText>
              </div>
            </div>

            {/* --- stats --- */}
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-block-background p-4">
              <StatCell label={t('dashboard.staking.positions.detail.stats.staked')}>
                <div className="flex flex-col">
                  <AssetBalance value={row.staked} asset={row.asset} className="text-footnote" />
                  <AssetFiatBalance asset={row.asset} amount={row.staked} />
                </div>
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.status')}>
                <PositionStatusPill status={row.position.status} statusReason={row.position.statusReason} />
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.apy')}>
                {row.apy === null ? (
                  <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
                ) : (
                  <FootnoteText className="text-text-positive">
                    {t('dashboard.stakingOverview.apy', { apy: row.apy.toFixed(1) })}
                  </FootnoteText>
                )}
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.share')}>
                <FootnoteText className="text-text-secondary">{`${row.sharePercent.toFixed(1)}%`}</FootnoteText>
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.unclaimed')}>
                {hasUnclaimed ? (
                  <div className="flex items-center gap-x-2">
                    <AssetBalance value={unclaimed.total} asset={row.asset} className="text-footnote" />
                    {unclaimed.urgency && unclaimed.expiryDays !== null ? (
                      <div
                        className={cnTw('flex h-4.5 items-center rounded-full px-1.5', {
                          'bg-badge-red-background-default text-text-negative': unclaimed.urgency === 'critical',
                          'bg-badge-orange-background-default text-text-warning': unclaimed.urgency === 'warning',
                          'bg-badge-green-background-default text-text-positive': unclaimed.urgency === 'safe',
                        })}
                      >
                        <CaptionText className="text-inherit">
                          {t('dashboard.staking.positions.expiry.days', {
                            days: Math.floor(unclaimed.expiryDays),
                          })}
                        </CaptionText>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
                )}
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.validators')}>
                <FootnoteText className="text-text-secondary">
                  {t('dashboard.staking.positions.validatorsValue', {
                    active: row.activeValidatorCount,
                    total: row.nominationCount,
                  })}
                </FootnoteText>
              </StatCell>
            </div>

            {/* --- unbonding --- */}
            {nextChunk ? (
              <div className="flex items-center justify-between rounded-lg border border-token-container-border px-4 py-3">
                <div className="flex items-center gap-x-2">
                  <Icon name="unstake" size={16} className="text-icon-default" />
                  <AssetBalance value={nextChunk.value} asset={row.asset} className="text-footnote" />
                </div>

                <FootnoteText className="text-text-tertiary">
                  {countdown
                    ? `${
                        countdown.elapsed
                          ? t('dashboard.staking.positions.detail.unbondingReady')
                          : t('dashboard.staking.positions.detail.unbondingLeft', {
                              days: countdown.days,
                              hours: countdown.hours,
                            })
                      } ${t('dashboard.staking.positions.detail.unbondingUnlock', {
                        date: formatDate(new Date(countdown.unlockAtMs), 'MMM d'),
                      })}`
                    : t('dashboard.staking.positions.detail.unbondingEras', { count: nextChunk.erasLeft })}
                </FootnoteText>
              </div>
            ) : null}

            {/* --- actions --- */}
            {watchOnly ? (
              <div className="rounded-lg bg-block-background px-4 py-3">
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.staking.positions.detail.watchOnlyNote')}
                </FootnoteText>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {renderAction(
                  'claim',
                  hasUnclaimed
                    ? t('dashboard.staking.positions.detail.actions.claim', { amount: claimLabelAmount })
                    : t('dashboard.staking.positions.detail.actions.claimEmpty'),
                  () => positionActions.events.claimRequested({ ...actionPayload, amount: unclaimed.total }),
                  true,
                  hasUnclaimed ? undefined : t('dashboard.staking.positions.detail.actions.nothingToClaim'),
                )}

                {renderAction('addStake', t('dashboard.staking.positions.detail.actions.addStake'), () =>
                  positionActions.events.addStakeRequested(actionPayload),
                )}

                {renderAction('unbond', t('dashboard.staking.positions.detail.actions.unbond'), () =>
                  positionActions.events.unbondRequested(actionPayload),
                )}

                {/*
                 * Gated like the rest: the picker itself works, but nothing yet
                 * turns the chosen set into a `nominate` transaction, so opening
                 * it would end on a submit that goes nowhere.
                 */}
                {renderAction(
                  'changeValidators',
                  t('dashboard.staking.positions.detail.actions.changeValidators'),
                  () => positionActions.events.changeValidatorsRequested(actionPayload),
                )}
              </div>
            )}

            {/* --- nominations --- */}
            <div className="flex flex-col gap-y-2">
              <BodyText>{t('dashboard.staking.positions.detail.nominations.title')}</BodyText>
              <NominationsTable rows={nominationRows} counts={counts} chain={row.chain} asset={row.asset} />
            </div>
          </div>
        ) : null}
      </Drawer.Content>
    </Drawer>
  );
};
