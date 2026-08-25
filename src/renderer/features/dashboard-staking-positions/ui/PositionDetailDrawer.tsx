import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';
import { BodyText, Button, CaptionText, FootnoteText, Icon, Loader } from '@/shared/ui';
import { AssetBalance, ChainIcon } from '@/shared/ui-entities';
import { Drawer, Label, Tooltip } from '@/shared/ui-kit';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { useChainHasSigner } from '../hooks/useChainHasSigner';
import { useNominationRows } from '../hooks/useNominationRows';
import { useUnclaimedRewards } from '../hooks/useUnclaimedRewards';
import {
  type PositionRow,
  getBlockedReasonKey,
  getCountdownParts,
  getExpiryLabelKey,
  getUnbondingCountdown,
} from '../lib';
import { type PositionAction, positionActions } from '../model/position-actions';

import { NominationsTable } from './NominationsTable';
import { PositionStatusPill } from './PositionStatusPill';
import { RewardsDestinationCell } from './RewardsDestinationCell';
import { StatCellSkeleton } from './StatCellSkeleton';
import { ValidatorStatsSection } from './ValidatorStatsSection';
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
  // Independent of the position's own account on purpose: a payout is
  // permissionless, so a contact position stays claimable as long as ANY
  // account of ours can sign on the chain — the same rule the Rewards modal
  // gates its Claim button by.
  const chainHasSigner = useChainHasSigner(row?.chain ?? null);
  const isValidatorPosition = row?.position.kind === 'validator';
  const { rows: nominationRows, counts } = useNominationRows(isValidatorPosition ? null : (row?.position ?? null));

  // Which chip is waiting for its flow to open. The handoff itself is instant,
  // but the screen it opens can take a moment to mount — the chip owes the user
  // a spinner for that gap instead of a click that visibly does nothing.
  const [loadingAction, setLoadingAction] = useState<PositionAction | null>(null);
  const deferredOpenRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(deferredOpenRef.current), []);

  const nowMs = useMemo(() => Date.now(), [row?.id]);

  const isOpen = row !== null;
  // The badge's own question, narrower than "blocked": an address-book contact
  // nobody can route to is blocked too, and it wears `Address book`, not this.
  const watchOnly = row !== null && row.access.mode === 'blocked' && row.access.reason === 'watchOnly';
  /**
   * Why this position offers no origin-bound actions, `null` when it does.
   *
   * Blocked rows keep their chips and say why, rather than dropping the strip:
   * the reasons are specific and two of them are things the user can go and fix
   * — connect an address book, ask an admin — and a control that vanishes
   * cannot carry that sentence.
   */
  const accessBlockedReasonKey = row === null ? null : getBlockedReasonKey(row.access);
  const accessBlockedHint = accessBlockedReasonKey === null ? undefined : t(accessBlockedReasonKey);
  // The badge states a fact about provenance, and `wallet` is that fact: an
  // address-book contact (or a contact multisig) has no local wallet behind it,
  // and wearing "Local wallet" there is a lie. A local wallet that merely
  // cannot sign (watch-only, a multisig without a local signatory) is still a
  // local wallet — signability is the pencil glyph's business, not this badge's.
  const isContact = row !== null && row.wallet === null;
  // `unbond` takes from the active stake only. A ledger whose whole stake is
  // already unbonding shows a row, a status and a countdown, but has nothing
  // left to unbond — the chip must say so instead of opening a flow at 0.
  const unbondBlockedHint =
    accessBlockedHint ??
    (row !== null && new BN(row.position.stake.active).isZero()
      ? t('dashboard.staking.positions.detail.actions.nothingToUnbond')
      : undefined);
  // While the payout scan is in flight `unclaimed.total` is a placeholder `'0'`,
  // not an answer. Reading it as one made the drawer open with "Nothing to claim
  // on this position" over a position that turned out to have rewards.
  const unclaimedPending = unclaimed.pending;
  const hasUnclaimed = !unclaimedPending && !new BN(unclaimed.total).isZero();

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
  // Two units, largest first, with the leading zeroes dropped — see
  // `getCountdownParts`. The chip on the positions modal renders the same one.
  const countdownParts = countdown ? getCountdownParts(countdown) : null;
  const countdownLabel = countdownParts ? t(`time.compact.${countdownParts.unit}`, { ...countdownParts }) : '';

  const actionPayload = row
    ? {
        position: row.position,
        chain: row.chain,
        asset: row.asset,
        account: row.account,
        wallet: row.wallet,
        signingMode: toSigningMode(row.access),
      }
    : null;

  // "No signer" wins over "nothing to claim": a chain nobody here can sign on
  // stays blocked no matter what the scan finds. Below that, a scan still in
  // flight leaves the chip enabled — it asserts nothing about payouts it has
  // not checked yet; only a finished scan that found nothing disables it.
  const claimBlockedHint = !chainHasSigner
    ? t('dashboard.staking.positions.detail.actions.noSigner', { network: row?.chain.name ?? '' })
    : hasUnclaimed || unclaimedPending
      ? undefined
      : t('dashboard.staking.positions.detail.actions.nothingToClaim');

  // Two frames, not one: the first paints the spinner, the second runs once it
  // is actually on screen — only then mount the flow. Dispatching straight from
  // the click puts the mount in the same task as the click, and the spinner
  // never gets a chance to appear.
  const openWithLoader = (action: PositionAction, dispatch: () => void) => {
    if (loadingAction) return;

    setLoadingAction(action);
    deferredOpenRef.current = requestAnimationFrame(() => {
      deferredOpenRef.current = requestAnimationFrame(() => {
        dispatch();
        setLoadingAction(null);
      });
    });
  };

  const renderAction = (
    action: PositionAction,
    label: string,
    onClick: () => void,
    primary = false,
    blockedHint?: string,
  ) => {
    const disabled = !wiredActions.includes(action) || Boolean(blockedHint);
    const loading = loadingAction === action;

    return (
      <Tooltip open={disabled ? undefined : false}>
        <Tooltip.Trigger>
          <div>
            <Button
              size="sm"
              variant={primary ? 'fill' : 'chip'}
              pallet={primary ? 'primary' : 'secondary'}
              disabled={disabled}
              prefixElement={loading ? <Loader color={primary ? 'white' : 'primary'} size={14} /> : undefined}
              onClick={loading ? undefined : onClick}
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
      // Sized by the nominations table, which is the widest thing in here: six
      // columns, four of them sortable, and an account cell that should not
      // have to truncate a validator's address. At 560 the headers themselves
      // no longer fit. The app's window is at least 1372px wide, so this still
      // leaves the dashboard behind it readable.
      width={720}
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
                <Label variant={watchOnly || isContact ? 'gray' : 'green'}>
                  {watchOnly
                    ? t('dashboard.staking.positions.viewOnly')
                    : isContact
                      ? t('dashboard.staking.positions.addressBook')
                      : t('dashboard.staking.positions.localWallet')}
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
                <PositionStatusPill
                  status={row.position.status}
                  statusReason={row.position.statusReason}
                  kind={row.position.kind}
                />
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.apy')}>
                {row.apy === null ? (
                  <FootnoteText className="text-text-tertiary">{t('dashboard.staking.positions.noValue')}</FootnoteText>
                ) : (
                  // The stat label already says APY — a bare percent, same as the table cell.
                  <FootnoteText className="text-text-positive">{`${row.apy.toFixed(1)}%`}</FootnoteText>
                )}
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.share')}>
                <FootnoteText className="text-text-secondary">{`${row.sharePercent.toFixed(1)}%`}</FootnoteText>
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.unclaimed')}>
                {unclaimedPending ? (
                  <StatCellSkeleton />
                ) : hasUnclaimed ? (
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
                          {getExpiryLabelKey(unclaimed.expiryDays) === 'expiring'
                            ? t('dashboard.staking.positions.expiry.expiring')
                            : t('dashboard.staking.positions.expiry.days', {
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

              <StatCell
                label={
                  isValidatorPosition
                    ? t('dashboard.staking.positions.detail.stats.nominators')
                    : t('dashboard.staking.positions.detail.stats.validators')
                }
              >
                <FootnoteText className="text-text-secondary">
                  {isValidatorPosition
                    ? row.position.validator?.nominatorCount == null
                      ? t('dashboard.staking.positions.noValue')
                      : t('dashboard.staking.positions.nominatorsValue', {
                          count: row.position.validator.nominatorCount,
                        })
                    : t('dashboard.staking.positions.validatorsValue', {
                        active: row.activeValidatorCount,
                        total: row.nominationCount,
                      })}
                </FootnoteText>
              </StatCell>

              <StatCell label={t('dashboard.staking.positions.detail.stats.rewards')}>
                <RewardsDestinationCell
                  payee={row.payee}
                  payeeLoaded={row.payeeLoaded}
                  chain={row.chain}
                  stash={row.position.stake.stash}
                />
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
                          : t('dashboard.staking.positions.detail.unbondingLeft', { duration: countdownLabel })
                      } ${t('dashboard.staking.positions.detail.unbondingUnlock', {
                        date: formatDate(new Date(countdown.unlockAtMs), 'MMM d'),
                      })}`
                    : t('dashboard.staking.positions.detail.unbondingEras', { count: nextChunk.erasLeft })}
                </FootnoteText>
              </div>
            ) : null}

            {/* --- actions --- */}
            <div className="flex flex-wrap items-center gap-2">
              {/*
               * Claim is the one action a blocked position may still take. A
               * payout call names the *validator* and is permissionless, so the
               * reward reaches this position's payee whoever submits it — the
               * dashboard substitutes a payer of ours. What gates it is
               * therefore whether anyone here can sign on the network, not
               * whether we hold this particular account.
               */}
              {renderAction(
                'claim',
                hasUnclaimed
                  ? t('dashboard.staking.positions.detail.actions.claim', { amount: claimLabelAmount })
                  : t('dashboard.staking.positions.detail.actions.claimEmpty'),
                () => positionActions.events.claimRequested({ ...actionPayload, amount: unclaimed.total }),
                true,
                claimBlockedHint,
              )}

              {renderAction(
                'addStake',
                t('dashboard.staking.positions.detail.actions.addStake'),
                () => positionActions.events.addStakeRequested(actionPayload),
                false,
                accessBlockedHint,
              )}

              {renderAction(
                'unbond',
                t('dashboard.staking.positions.detail.actions.unbond'),
                () => positionActions.events.unbondRequested(actionPayload),
                false,
                unbondBlockedHint,
              )}

              {/* Nominator and validator alike: every stash has a payee. */}
              {renderAction(
                'changeRewardDestination',
                t('dashboard.staking.positions.detail.actions.changeRewardDestination'),
                () => positionActions.events.changeRewardDestinationRequested(actionPayload),
                false,
                accessBlockedHint,
              )}

              {/*
               * Absent, not disabled, on a validator position: a validator has
               * no nominations to change, so the chip would be answering a
               * question the row never asks.
               */}
              {isValidatorPosition
                ? null
                : renderAction(
                    'changeValidators',
                    t('dashboard.staking.positions.detail.actions.changeValidators'),
                    () =>
                      openWithLoader('changeValidators', () =>
                        positionActions.events.changeValidatorsRequested(actionPayload),
                      ),
                    false,
                    accessBlockedHint,
                  )}
            </div>

            {/* --- nominations / validator stats --- */}
            {isValidatorPosition && row.position.validator ? (
              <div className="flex flex-col gap-y-2">
                <BodyText>{t('dashboard.staking.positions.detail.validator.title')}</BodyText>
                {row.position.status === 'waiting' ? (
                  <FootnoteText className="text-text-tertiary">
                    {t('dashboard.staking.positions.detail.validator.notElected')}
                  </FootnoteText>
                ) : null}
                <ValidatorStatsSection validator={row.position.validator} asset={row.asset} />
              </div>
            ) : (
              <div className="flex flex-col gap-y-2">
                <BodyText>{t('dashboard.staking.positions.detail.nominations.title')}</BodyText>
                <NominationsTable rows={nominationRows} counts={counts} chain={row.chain} asset={row.asset} />
              </div>
            )}
          </div>
        ) : null}
      </Drawer.Content>
    </Drawer>
  );
};
