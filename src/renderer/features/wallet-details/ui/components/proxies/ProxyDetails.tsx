import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon } from '@/shared/ui';
import { Box, Copy, Tooltip } from '@/shared/ui-kit';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import { WalletPairingOperationTrigger } from '@/features/wallet-pairing';
import {
  type PendingMultisigOperationRef,
  type WalletProxy,
  type WalletProxyLastOperation,
} from '../../../model/proxies-model';

type Props = {
  proxy: WalletProxy;
  verifyAction: ReactNode | null;
  editAction?: ReactNode | null;
  onRemove?: (proxy: WalletProxy) => void;
  onCloseWalletDetails?: () => void;
};

const ProxyDetailExplanation = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3">{children}</div>
);

const ProxyDetailActions = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export const ProxyDetails = ({ proxy, verifyAction, editAction, onRemove, onCloseWalletDetails }: Props) => {
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[proxy.chainId];
  const addressPrefix = chain?.addressPrefix;
  const proxyAddress = toAddress(proxy.proxyAccountId, { prefix: addressPrefix });

  const canRevoke = Boolean(onRemove) && proxy.status !== 'pending_addition' && proxy.pendingRemovalOperation === null;

  const revokeButton = canRevoke ? (
    <Tooltip>
      <Tooltip.Trigger>
        <Button size="sm" variant="fill" pallet="error" onClick={() => onRemove?.(proxy)}>
          <Icon name="delete" size={16} className="text-inherit" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('walletDetails.common.removeProxyAction')}</Tooltip.Content>
    </Tooltip>
  ) : null;

  const goToOperation = (ref: PendingMultisigOperationRef | WalletProxyLastOperation) => {
    const link =
      'operationId' in ref
        ? multisigOperationService.generateMultisigOperationRelativeLink(ref)
        : multisigOperationService.generateMultisigOperationRelativeLink({
            chainId: proxy.chainId,
            callHash: ref.callHash,
            multisigAccountId: ref.multisigAccountId,
            blockCreated: ref.blockNumber,
            indexCreated: ref.indexCreated,
          });
    onCloseWalletDetails?.();
    navigate(link);
  };

  const getOperationDeepLink = (ref: PendingMultisigOperationRef | WalletProxyLastOperation) =>
    'operationId' in ref
      ? multisigOperationService.generateMultisigOperationDeepLink({
          chainId: ref.chainId,
          callHash: ref.callHash,
          multisigAccountId: ref.multisigAccountId,
          blockCreated: ref.blockCreated,
          indexCreated: ref.indexCreated,
        })
      : multisigOperationService.generateMultisigOperationDeepLink({
          chainId: proxy.chainId,
          callHash: ref.callHash,
          multisigAccountId: ref.multisigAccountId,
          blockCreated: ref.blockNumber,
          indexCreated: ref.indexCreated,
        });

  const shareOperationDeepLinkButton = (deepLink: string) => (
    <Tooltip>
      <Tooltip.Trigger>
        <Copy value={deepLink} notification={t('general.notifications.operationLinkCopied')}>
          <Button
            size="sm"
            variant="fill"
            pallet="secondary"
            prefixElement={<Icon name="share" size={16} className="text-inherit" />}
          >
            {t('walletDetails.proxies.shareOperation')}
          </Button>
        </Copy>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('operations.shareOperationTooltip')}</Tooltip.Content>
    </Tooltip>
  );

  const pendingRemovalAction = proxy.pendingRemovalOperation ? (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="fill"
        pallet="secondary"
        onClick={() => proxy.pendingRemovalOperation && goToOperation(proxy.pendingRemovalOperation)}
      >
        {t('walletDetails.proxies.viewOperation')}
      </Button>
      {shareOperationDeepLinkButton(getOperationDeepLink(proxy.pendingRemovalOperation))}
    </div>
  ) : null;

  const pendingRemovalNote = proxy.pendingRemovalOperation ? (
    <FootnoteText className="text-text-secondary">{t('walletDetails.proxies.pendingRemovalDescription')}</FootnoteText>
  ) : null;

  const pendingVerificationAction = proxy.pendingVerificationOperation ? (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="fill"
        pallet="secondary"
        onClick={() => proxy.pendingVerificationOperation && goToOperation(proxy.pendingVerificationOperation)}
      >
        {t('walletDetails.proxies.viewOperation')}
      </Button>
      {shareOperationDeepLinkButton(getOperationDeepLink(proxy.pendingVerificationOperation))}
    </div>
  ) : null;

  if (proxy.status === 'verified') {
    const lastOp = proxy.lastOperation;
    const coreTx = lastOp ? findCoreTransaction(lastOp.transaction) : null;
    const operationTitle =
      coreTx?.section && coreTx?.method
        ? formatSectionAndMethod(coreTx.section, coreTx.method)
        : t('walletDetails.proxies.verifiedOperationUnknown');

    const handleGoToOperation = () => {
      if (!lastOp) return;
      goToOperation(lastOp);
    };

    // No pending-removal op → fold proxy-level actions (Edit/Delete) into the verified-op
    // button row for a compact one-line layout. With pending removal, keep each op as its
    // own description+buttons block and put proxy-level actions on a dedicated row so the
    // two "View operation / Share" pairs don't read ambiguously side-by-side.
    const hasPendingRemoval = Boolean(proxy.pendingRemovalOperation);

    return (
      <Box direction="column" gap={4} padding={[4, 5]}>
        {lastOp && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <FootnoteText className="inline-flex flex-wrap items-baseline gap-2">
                <span className="shrink-0 text-text-tertiary">{t('walletDetails.proxies.verifiedOperationLabel')}</span>
                <span className="min-w-0 text-text-primary">{operationTitle}</span>
              </FootnoteText>
              <FootnoteText className="inline-flex flex-wrap items-baseline gap-2">
                <span className="shrink-0 text-text-tertiary">{t('walletDetails.proxies.verifiedDateLabel')}</span>
                <span className="min-w-0 text-text-primary">{formatDate(new Date(lastOp.timestamp), 'PPp')}</span>
              </FootnoteText>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="fill" pallet="secondary" onClick={handleGoToOperation}>
                {t('walletDetails.proxies.viewOperation')}
              </Button>
              {shareOperationDeepLinkButton(getOperationDeepLink(lastOp))}
              {!hasPendingRemoval && editAction}
              {!hasPendingRemoval && revokeButton}
            </div>
          </div>
        )}

        {hasPendingRemoval && (
          <div className="flex flex-col gap-2">
            {pendingRemovalNote}
            {pendingRemovalAction}
          </div>
        )}

        {hasPendingRemoval && (editAction || revokeButton) && (
          <ProxyDetailActions>
            {editAction}
            {revokeButton}
          </ProxyDetailActions>
        )}
      </Box>
    );
  }

  if (proxy.status === 'pending_addition') {
    const handleGoToOperation = () => {
      if (!proxy.pendingOperation) return;
      goToOperation(proxy.pendingOperation);
    };

    return (
      <Box direction="column" gap={4} padding={[4, 5]}>
        <ProxyDetailExplanation>
          <FootnoteText className="text-text-secondary">
            {t('walletDetails.proxies.pendingAdditionDescription')}
          </FootnoteText>
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          {proxy.pendingOperation && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="fill" pallet="secondary" onClick={handleGoToOperation}>
                {t('walletDetails.proxies.viewOperation')}
              </Button>
              {shareOperationDeepLinkButton(getOperationDeepLink(proxy.pendingOperation))}
            </div>
          )}
        </ProxyDetailActions>
      </Box>
    );
  }

  if (proxy.status === 'not_verified_no_wallet') {
    return (
      <Box direction="column" gap={4} padding={[4, 5]}>
        <ProxyDetailExplanation>
          <FootnoteText className="text-text-secondary">{t('walletDetails.proxies.noWalletDescription')}</FootnoteText>
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          <Copy value={proxyAddress} notification={t('general.notifications.addressCopied')}>
            <Button size="sm" variant="fill" pallet="secondary">
              {t('walletDetails.proxies.noWalletCopyAddress')}
            </Button>
          </Copy>
          <WalletPairingOperationTrigger tooltipContent={t('walletDetails.proxies.addWalletTooltip')} />
          {pendingRemovalAction}
          {revokeButton}
        </ProxyDetailActions>
      </Box>
    );
  }

  if (proxy.pendingVerificationOperation) {
    return (
      <Box direction="column" gap={4} padding={[4, 5]}>
        <ProxyDetailExplanation>
          <FootnoteText className="inline-flex items-center gap-1.5 text-text-secondary">
            <Icon name="loader" size={16} className="text-icon-accent" />
            {t('walletDetails.proxies.pendingVerificationHeadline')}
          </FootnoteText>
          <FootnoteText className="text-text-secondary">
            {t('walletDetails.proxies.pendingVerificationDescription')}
          </FootnoteText>
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          {pendingVerificationAction}
          {editAction}
          {pendingRemovalAction}
          {revokeButton}
        </ProxyDetailActions>
      </Box>
    );
  }

  if (!verifyAction) {
    const multisigExplanationKey =
      proxy.delay > 0 ? 'walletDetails.proxies.cannotAutoVerifyDelay' : 'walletDetails.proxies.cannotAutoVerify';
    const explanation = (
      <FootnoteText className="text-text-secondary">
        {proxy.proxyMultisigAccountId ? t(multisigExplanationKey) : t('walletDetails.proxies.nonMultisigDescription')}
      </FootnoteText>
    );

    return (
      <Box direction="column" gap={4} padding={[4, 5]}>
        <ProxyDetailExplanation>
          {explanation}
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        {(editAction || pendingRemovalAction || revokeButton) && (
          <ProxyDetailActions>
            {editAction}
            {pendingRemovalAction}
            {revokeButton}
          </ProxyDetailActions>
        )}
      </Box>
    );
  }

  return (
    <Box direction="column" gap={4} padding={[4, 5]}>
      <ProxyDetailExplanation>
        <FootnoteText className="text-text-secondary">{t('walletDetails.proxies.verifyDescription')}</FootnoteText>
        {pendingRemovalNote}
      </ProxyDetailExplanation>
      <ProxyDetailActions>
        {verifyAction}
        {editAction}
        {pendingRemovalAction}
        {revokeButton}
      </ProxyDetailActions>
    </Box>
  );
};
