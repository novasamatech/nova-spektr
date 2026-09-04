import { useStoreMap } from 'effector-react';
import { type ComponentProps, memo } from 'react';

import { ConnectionStatus } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { type GovernanceLockRow } from '../lib/buildLockRows';
import { DISPLAY_DATE_FORMAT } from '../lib/constants';
import { formatToken } from '../lib/formatToken';
import { BLOCK_REASON_HINT } from '../lib/resolveUnlockAccount';

type HintProps = {
  text: string;
  hint: string;
};

/**
 * A verdict the user cannot act on: why it says so lives in the tooltip. A real
 * button, so the keyboard reaches the tooltip too.
 */
const HintText = memo(({ text, hint }: HintProps) => (
  <Tooltip>
    <Tooltip.Trigger>
      <button
        type="button"
        className="flex w-full cursor-default items-center justify-end gap-1 text-text-tertiary"
        aria-label={`${text}. ${hint}`}
      >
        <FootnoteText className="whitespace-nowrap text-inherit">{text}</FootnoteText>
        <span aria-hidden="true" className="flex">
          <Icon name="info" size={14} className="shrink-0 text-inherit" />
        </span>
      </button>
    </Tooltip.Trigger>
    <Tooltip.Content>{hint}</Tooltip.Content>
  </Tooltip>
));

type Props = {
  row: GovernanceLockRow;
  onUnlock: (row: GovernanceLockRow) => void;
  onUndelegate: (row: GovernanceLockRow) => void;
};

type WithConnection = {
  /** Whether the row's chain has a live connection — nothing signs without one. */
  chainConnected: boolean;
};

type ActionButtonProps = {
  label: string;
  hint: string;
  caption: string | null;
  /**
   * Warning tone marks a caption the user must act on — a multisig's missing
   * signatures.
   */
  captionTone?: 'default' | 'warning';
  pallet: ComponentProps<typeof Button>['pallet'];
  disabled: boolean;
  onClick: () => void;
};

/**
 * A button with its verdict: the tooltip says why it is enabled or not, the
 * caption under it says what signing will do. A disabled button swallows
 * pointer events and cannot take focus, so the wrapper keeps the tooltip
 * reachable by mouse and, when disabled, by keyboard.
 */
const ActionButton = memo(
  ({ label, hint, caption, captionTone = 'default', pallet, disabled, onClick }: ActionButtonProps) => (
    <Tooltip>
      <Tooltip.Trigger>
        {/* A disabled button is invisible to the tooltip and to focus, so the
            wrapper carries both — and the reason, for a reader that never hovers. */}
        <div
          className="flex flex-col items-end gap-0.5"
          tabIndex={disabled ? 0 : undefined}
          aria-label={disabled ? hint : undefined}
        >
          <Button size="sm" pallet={pallet} className="whitespace-nowrap" disabled={disabled} onClick={onClick}>
            {label}
          </Button>
          {!disabled && caption && (
            <FootnoteText
              className={
                captionTone === 'warning'
                  ? 'text-help-text whitespace-nowrap text-text-warning'
                  : 'text-help-text whitespace-nowrap text-text-tertiary'
              }
            >
              {caption}
            </FootnoteText>
          )}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{hint}</Tooltip.Content>
    </Tooltip>
  ),
);

/**
 * The Unlock verdict — what the widget always showed. `null` when the row only
 * delegates.
 */
const UnlockVerdict = memo(({ row, chainConnected, onUnlock }: Omit<Props, 'onUndelegate'> & WithConnection) => {
  const { t, formatDate } = useI18n();

  if (row.claimable.isZero()) {
    // Delegation has no unlock date at all — a pending lock at least has one.
    // A delegation-only row shows the Undelegate button instead of a hint.
    if (row.delegations.length > 0 && row.pending.isZero()) return null;

    const hint = row.nextUnlockAtMs
      ? t('dashboard.governanceLocks.hint.nothingClaimableUntil', {
          // Estimates read the same as the Ended tab's dates — one format for
          // every date on the tab.
          date: formatDate(row.nextUnlockAtMs, DISPLAY_DATE_FORMAT),
        })
      : t('dashboard.governanceLocks.hint.nothingClaimable');

    return <HintText text={t('dashboard.governanceLocks.nothingClaimable')} hint={hint} />;
  }

  // A `remove_vote` is origin-bound: no key, no release — not even by a payer.
  if (row.blockReason === 'watch-only') {
    return (
      <HintText text={t('dashboard.governanceLocks.watchOnly')} hint={t('dashboard.governanceLocks.hint.watchOnly')} />
    );
  }

  const amount = formatToken(row.claimable, row.precision, row.symbol);
  const initiator = row.initiator;
  const disabled = !initiator || !chainConnected;
  const isMultisig = initiator ? accountUtils.isAnyMultisigAccount(initiator) : false;
  const isPermissionless = initiator ? initiator.accountId !== row.target : false;

  let hint: string;
  if (disabled) {
    hint = row.blockReason
      ? t(BLOCK_REASON_HINT[row.blockReason])
      : t('dashboard.governanceLocks.hint.chainDisconnected');
  } else if (isMultisig) {
    hint = t('dashboard.governanceLocks.hint.multisig');
  } else if (isPermissionless) {
    hint = t('dashboard.governanceLocks.hint.permissionless');
  } else {
    hint = t('dashboard.governanceLocks.hint.unlock', { amount });
  }

  // What the button does, in one line under it: who else has to sign, who
  // pays, or simply how much comes back.
  const caption = isMultisig
    ? t('dashboard.governanceLocks.needsSignatories')
    : isPermissionless
      ? t('dashboard.governanceLocks.permissionless')
      : amount;

  return (
    <ActionButton
      label={t('dashboard.governanceLocks.unlock')}
      hint={hint}
      caption={caption}
      captionTone={isMultisig ? 'warning' : 'default'}
      pallet={isPermissionless ? 'secondary' : 'primary'}
      disabled={disabled}
      onClick={() => onUnlock(row)}
    />
  );
});

/**
 * The Undelegate button — only for a row that delegates. Always origin-bound,
 * never permissionless.
 */
const UndelegateAction = memo(({ row, chainConnected, onUndelegate }: Omit<Props, 'onUnlock'> & WithConnection) => {
  const { t } = useI18n();

  const initiator = row.undelegateInitiator;
  const disabled = !initiator || !chainConnected;
  const isMultisig = initiator ? accountUtils.isAnyMultisigAccount(initiator) : false;
  const count = row.delegations.length;

  // Same precedence as the Unlock verdict: a missing key outranks a missing
  // connection, because reconnecting would not make the button work.
  let hint: string;
  if (disabled) {
    hint = !initiator
      ? row.undelegateBlockReason === 'watch-only'
        ? t('dashboard.governanceLocks.hint.undelegateWatchOnly')
        : t(BLOCK_REASON_HINT[row.undelegateBlockReason ?? 'no-signer'])
      : t('dashboard.governanceLocks.hint.chainDisconnected');
  } else if (isMultisig) {
    hint = t('dashboard.governanceLocks.hint.multisig');
  } else {
    hint = t('dashboard.governanceLocks.hint.undelegate', { count });
  }

  return (
    <ActionButton
      label={t('dashboard.governanceLocks.undelegate')}
      hint={hint}
      caption={
        isMultisig
          ? t('dashboard.governanceLocks.needsSignatories')
          : t('dashboard.governanceLocks.tracksCount', { count })
      }
      captionTone={isMultisig ? 'warning' : 'default'}
      pallet="secondary"
      disabled={disabled}
      onClick={() => onUndelegate(row)}
    />
  );
});

/**
 * The row's verdicts, stacked: what can be released now on top, and beneath it
 * — when the account delegates — the button that takes the delegation back.
 */
export const LockActionCell = memo(({ row, onUnlock, onUndelegate }: Props) => {
  /**
   * The cell reads its own chain's status rather than being handed it: the
   * whole record changes whenever any of the app's networks flips, and a table
   * that passed it down would rebuild its columns and re-render every row for a
   * network none of them shows.
   */
  const chainConnected = useStoreMap({
    store: networkModel.$connectionStatuses,
    keys: [row.chainId],
    fn: (statuses, [chainId]) => statuses[chainId] === ConnectionStatus.CONNECTED,
  });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <UnlockVerdict row={row} chainConnected={chainConnected} onUnlock={onUnlock} />
      {row.delegations.length > 0 && (
        <UndelegateAction row={row} chainConnected={chainConnected} onUndelegate={onUndelegate} />
      )}
    </div>
  );
});
