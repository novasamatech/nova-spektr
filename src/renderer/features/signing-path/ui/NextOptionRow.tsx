import { type BN } from '@polkadot/util';
import { type ReactNode } from 'react';

import { type Asset, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress, toShortAddress } from '@/shared/lib/utils';
import { BodyText, HelpText } from '@/shared/ui';
import { AssetBalance, WalletAccountIcon } from '@/shared/ui-entities';
import { type LabelVariant, Label, Tooltip } from '@/shared/ui-kit';
import { type PathNextOption, type ProxyEdgeStatus } from '../model/graph-model';

const STATUS_TO_VARIANT: Record<ProxyEdgeStatus, LabelVariant> = {
  verified: 'green',
  not_verified: 'orange',
  pending_verification: 'blue',
};

const STATUS_TO_LABEL_KEY: Record<ProxyEdgeStatus, string> = {
  verified: 'walletDetails.proxies.statusVerified',
  not_verified: 'walletDetails.proxies.statusNotVerified',
  pending_verification: 'walletDetails.proxies.statusPendingVerification',
};

const STATUS_TO_TOOLTIP_KEY: Partial<Record<ProxyEdgeStatus, string>> = {
  verified: 'walletDetails.proxies.verifiedHeadline',
  not_verified: 'walletDetails.proxies.notVerifiedHeadline',
};

type NextOptionRowProps = {
  option: PathNextOption;
  selected: boolean;
  onClick: () => void;
  trailing?: ReactNode;
  /**
   * Balance shown on the right side of the row — useful when the option is a
   * candidate signer whose available funds matter for the operation.
   */
  balance?: { value: BN | string; asset: Asset };
};

export const NextOptionRow = ({ option, selected, onClick, trailing, balance }: NextOptionRowProps) => {
  const { t } = useI18n();
  const address = toAddress(option.accountId);

  const subtitle =
    option.kind === 'multisig'
      ? option.threshold !== undefined && option.signatoriesCount !== undefined
        ? t('signingPath.label.thresholdRatio', { current: option.threshold, total: option.signatoriesCount })
        : t('signingPath.label.multisig')
      : toShortAddress(address, 8);

  const walletType = option.kind === 'multisig' ? WalletType.MULTISIG : null;
  const proxyType = option.proxyType;
  const isDisabled = Boolean(option.disabled);
  const disabledReason = option.disabledReason;
  const verificationStatus = option.kind === 'multisig' ? option.verificationStatus : undefined;

  const row = (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      className={cnTw(
        'flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-all',
        isDisabled && 'cursor-not-allowed border-container-border bg-input-background-disabled opacity-60',
        !isDisabled && 'cursor-pointer',
        !isDisabled && selected && 'border-icon-accent bg-icon-accent/6 shadow-card-shadow',
        !isDisabled &&
          !selected &&
          'border-container-border bg-white hover:border-icon-accent/40 hover:bg-action-background-hover',
      )}
      onClick={isDisabled ? undefined : onClick}
    >
      <WalletAccountIcon address={address} type={walletType} size={32} iconSize={12} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BodyText className={cnTw('truncate', isDisabled ? 'text-text-secondary' : 'text-text-primary')}>
          {option.name}
        </BodyText>
        <HelpText className="truncate text-text-tertiary">{subtitle}</HelpText>
      </div>
      {verificationStatus && <VerificationStatusBadge status={verificationStatus} disabled={isDisabled} />}
      {proxyType && (
        <span
          className={cnTw(
            'shrink-0 rounded-full border px-2 py-0.5 text-help-text',
            isDisabled
              ? 'bg-shade-4 border-shade-12 text-text-tertiary'
              : 'border-icon-accent/30 bg-icon-accent/8 text-icon-accent',
          )}
        >
          {proxyType}
        </span>
      )}
      {balance && (
        <AssetBalance value={balance.value} asset={balance.asset} className="text-footnote text-text-secondary" />
      )}
      {trailing}
      {!isDisabled && (
        <div
          className={cnTw(
            'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-icon-accent bg-icon-accent' : 'border-shade-12',
          )}
        >
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
      )}
    </button>
  );

  if (isDisabled && disabledReason) {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div>{row}</div>
        </Tooltip.Trigger>
        <Tooltip.Content>{disabledReason}</Tooltip.Content>
      </Tooltip>
    );
  }

  return row;
};

type VerificationStatusBadgeProps = {
  status: ProxyEdgeStatus;
  disabled: boolean;
};

const VerificationStatusBadge = ({ status, disabled }: VerificationStatusBadgeProps) => {
  const { t } = useI18n();
  const tooltipKey = STATUS_TO_TOOLTIP_KEY[status];

  const badge = (
    <span className={cnTw('inline-flex shrink-0', disabled && 'opacity-60')}>
      <Label variant={STATUS_TO_VARIANT[status]}>{t(STATUS_TO_LABEL_KEY[status])}</Label>
    </span>
  );

  if (!tooltipKey) return badge;

  return (
    <Tooltip>
      <Tooltip.Trigger>{badge}</Tooltip.Trigger>
      <Tooltip.Content>{t(tooltipKey)}</Tooltip.Content>
    </Tooltip>
  );
};
