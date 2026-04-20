import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, toAddress } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Box, Copy } from '@/shared/ui-kit';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import {
  type PendingMultisigOperationRef,
  type WalletProxy,
  type WalletProxyLastOperation,
} from '../../../model/proxies-model';

type Props = {
  proxy: WalletProxy;
  verifyAction: ReactNode | null;
  onRemove?: (proxy: WalletProxy) => void;
  onCloseWalletDetails?: () => void;
};

const ProxyDetailExplanation = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-2">{children}</div>
);

const ProxyDetailActions = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);

export const ProxyDetails = ({ proxy, verifyAction, onRemove, onCloseWalletDetails }: Props) => {
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[proxy.chainId];
  const addressPrefix = chain?.addressPrefix;
  const proxyAddress = toAddress(proxy.proxyAccountId, { prefix: addressPrefix });

  const canRevoke = Boolean(onRemove) && proxy.status !== 'pending_addition' && proxy.pendingRemovalOperation === null;

  const revokeButton = canRevoke ? (
    <Button size="sm" variant="fill" pallet="error" onClick={() => onRemove?.(proxy)}>
      {t('walletDetails.common.removeProxyAction')}
    </Button>
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

  const pendingRemovalAction = proxy.pendingRemovalOperation ? (
    <Button
      size="sm"
      variant="fill"
      pallet="secondary"
      onClick={() => proxy.pendingRemovalOperation && goToOperation(proxy.pendingRemovalOperation)}
    >
      {t('walletDetails.proxies.viewOperation')}
    </Button>
  ) : null;

  const pendingRemovalNote = proxy.pendingRemovalOperation ? (
    <FootnoteText className="text-text-secondary">{t('walletDetails.proxies.pendingRemovalDescription')}</FootnoteText>
  ) : null;

  const pendingVerificationAction = proxy.pendingVerificationOperation ? (
    <Button
      size="sm"
      variant="fill"
      pallet="secondary"
      onClick={() => proxy.pendingVerificationOperation && goToOperation(proxy.pendingVerificationOperation)}
    >
      {t('walletDetails.proxies.viewOperation')}
    </Button>
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

    return (
      <Box direction="column" gap={3} padding={[3, 4]}>
        <ProxyDetailExplanation>
          <FootnoteText className="inline-flex items-center gap-1 text-text-positive">
            <Icon name="checkmarkOutline" size={14} className="text-icon-positive" />
            {t('walletDetails.proxies.verifiedHeadline')}
          </FootnoteText>
          {lastOp && (
            <div className="flex flex-col gap-1">
              <DetailRow label={t('walletDetails.proxies.verifiedOperationLabel')}>{operationTitle}</DetailRow>
              <DetailRow label={t('walletDetails.proxies.verifiedDateLabel')}>
                {formatDate(new Date(lastOp.timestamp), 'PPp')}
              </DetailRow>
            </div>
          )}
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          {lastOp && (
            <Button size="sm" variant="fill" pallet="secondary" onClick={handleGoToOperation}>
              {t('walletDetails.proxies.viewOperation')}
            </Button>
          )}
          {pendingRemovalAction}
          {revokeButton}
        </ProxyDetailActions>
      </Box>
    );
  }

  if (proxy.status === 'pending_addition') {
    const handleGoToOperation = () => {
      if (!proxy.pendingOperation) return;
      goToOperation(proxy.pendingOperation);
    };

    return (
      <Box direction="column" gap={3} padding={[3, 4]}>
        <ProxyDetailExplanation>
          <FootnoteText className="text-text-secondary">
            {t('walletDetails.proxies.pendingAdditionDescription')}
          </FootnoteText>
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          <Button size="sm" variant="fill" pallet="secondary" onClick={handleGoToOperation}>
            {t('walletDetails.proxies.viewOperation')}
          </Button>
        </ProxyDetailActions>
      </Box>
    );
  }

  if (proxy.status === 'not_verified_no_wallet') {
    return (
      <Box direction="column" gap={3} padding={[3, 4]}>
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
          {pendingRemovalAction}
          {revokeButton}
        </ProxyDetailActions>
      </Box>
    );
  }

  if (proxy.pendingVerificationOperation) {
    return (
      <Box direction="column" gap={3} padding={[3, 4]}>
        <ProxyDetailExplanation>
          <FootnoteText className="inline-flex items-center gap-1 text-text-secondary">
            <Icon name="loader" size={14} className="text-icon-accent" />
            {t('walletDetails.proxies.pendingVerificationHeadline')}
          </FootnoteText>
          <FootnoteText className="text-text-secondary">
            {t('walletDetails.proxies.pendingVerificationDescription')}
          </FootnoteText>
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        <ProxyDetailActions>
          {pendingVerificationAction}
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
      <Box direction="column" gap={3} padding={[3, 4]}>
        <ProxyDetailExplanation>
          {explanation}
          {pendingRemovalNote}
        </ProxyDetailExplanation>
        {(pendingRemovalAction || revokeButton) && (
          <ProxyDetailActions>
            {pendingRemovalAction}
            {revokeButton}
          </ProxyDetailActions>
        )}
      </Box>
    );
  }

  return (
    <Box direction="column" gap={3} padding={[3, 4]}>
      <ProxyDetailExplanation>
        <FootnoteText className="inline-flex items-center gap-1 text-text-warning">
          <Icon name="warnCutout" size={14} className="text-icon-warning" />
          {t('walletDetails.proxies.notVerifiedHeadline')}
        </FootnoteText>
        <FootnoteText className="text-text-secondary">{t('walletDetails.proxies.verifyDescription')}</FootnoteText>
        {pendingRemovalNote}
      </ProxyDetailExplanation>
      <ProxyDetailActions>
        {verifyAction}
        {pendingRemovalAction}
        {revokeButton}
      </ProxyDetailActions>
    </Box>
  );
};
