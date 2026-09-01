import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';
import { type GovernanceLockRow } from '../lib/buildLockRows';
import { formatToken } from '../lib/formatToken';
import { type UnlockBlockReason } from '../lib/resolveUnlockAccount';

/**
 * I18n key spelling out each block reason — shared with the widget's click-time
 * verdict.
 */
export const BLOCK_REASON_HINT: Record<UnlockBlockReason, string> = {
  'no-local-account': 'dashboard.governanceLocks.hint.noLocalAccount',
  'chain-unsupported': 'dashboard.governanceLocks.hint.chainUnsupported',
  'watch-only': 'dashboard.governanceLocks.hint.watchOnly',
  'no-signer': 'dashboard.governanceLocks.hint.noSigner',
};

type HintProps = {
  text: string;
  hint: string;
};

/** A verdict the user cannot act on: why it says so lives in the tooltip. */
const HintText = memo(({ text, hint }: HintProps) => (
  <Tooltip>
    <Tooltip.Trigger>
      <div tabIndex={0} className="flex items-center justify-end gap-1 text-text-tertiary">
        <FootnoteText className="whitespace-nowrap text-inherit">{text}</FootnoteText>
        <Icon name="info" size={14} className="shrink-0 text-inherit" />
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>{hint}</Tooltip.Content>
  </Tooltip>
));

type Props = {
  row: GovernanceLockRow;
  /** Whether the row's chain has a live connection — nothing signs without one. */
  chainConnected: boolean;
  onUnlock: (row: GovernanceLockRow) => void;
};

export const LockActionCell = memo(({ row, chainConnected, onUnlock }: Props) => {
  const { t } = useI18n();

  if (row.claimable.isZero()) {
    // Delegation has no unlock date at all — a pending lock at least has one.
    if (!row.delegated.isZero() && row.pending.isZero()) {
      return (
        <HintText
          text={t('dashboard.governanceLocks.noUnlockDate')}
          hint={t('dashboard.governanceLocks.hint.delegated')}
        />
      );
    }

    const hint = row.nextUnlockAtMs
      ? t('dashboard.governanceLocks.hint.nothingClaimableUntil', {
          date: new Date(row.nextUnlockAtMs).toLocaleDateString(),
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

  const caption = isMultisig
    ? t('dashboard.governanceLocks.needsSignatories')
    : isPermissionless
      ? t('dashboard.governanceLocks.permissionless')
      : null;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        {/* A disabled button swallows pointer events — the wrapper keeps the tooltip reachable. */}
        <div className="flex flex-col items-end gap-0.5">
          <Button
            size="sm"
            pallet={isPermissionless ? 'secondary' : 'primary'}
            className="whitespace-nowrap"
            disabled={disabled}
            onClick={() => onUnlock(row)}
          >
            {t('dashboard.governanceLocks.unlock')}
          </Button>
          {!disabled && caption && (
            <FootnoteText
              className={isMultisig ? 'text-help-text text-text-warning' : 'text-help-text text-text-tertiary'}
            >
              {caption}
            </FootnoteText>
          )}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>{hint}</Tooltip.Content>
    </Tooltip>
  );
});
