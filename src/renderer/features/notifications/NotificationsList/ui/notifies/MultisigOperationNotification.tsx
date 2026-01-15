import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type MultisigOperationNotification, type NotificationStatus } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod, nonNullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { BodyText, Button, Icon, type IconNames } from '@/shared/ui';
import { AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { type OperationTitle, accounts, multisigOperation, multisigOperationService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { multisigService } from '@/entities/multisig-accounts';
import { networkModel } from '@/entities/network';
import { findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';

type Props = {
  notification: MultisigOperationNotification;
};

function getOperationStatus(status: NotificationStatus) {
  switch (status) {
    case 'error':
      return 'notifications.details.status.rejected';
    case 'success':
      return 'notifications.details.status.executed';
    case 'info':
    default:
      return 'notifications.details.status.created';
  }
}

const iconConfig: Record<NotificationStatus, { name: IconNames; className: string }> = {
  info: { name: 'info' as const, className: 'text-icon-accent' },
  success: { name: 'checkmarkOutline' as const, className: 'text-icon-positive' },
  error: { name: 'closeOutline' as const, className: 'text-icon-negative' },
};

export const MultisigOperationNotificationComponent = ({
  notification: { callHash, callTimepoint, chainId, issuer, status },
}: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const chains = useUnit(networkModel.$chains);

  const operationId = multisigOperationService.getOperationId(
    chainId,
    callHash,
    issuer,
    callTimepoint.height,
    callTimepoint.index,
  );

  const operation = useStoreMap({
    store: multisigOperation.$list,
    keys: [operationId],
    fn: (operations) =>
      operations.find(
        (op) =>
          multisigOperationService.getOperationId(
            op.chainId,
            op.callHash,
            op.accountId,
            op.blockCreated,
            op.indexCreated,
          ) === operationId,
      ),
  });

  const multisigAccount = useStoreMap({
    store: accounts.$list,
    keys: [issuer, operation],
    fn: (allAccounts) => {
      if (!operation) return null;

      const flexibleMultisigAccount = allAccounts
        .filter(accountUtils.isFlexibleMultisigAccount)
        .filter((acc) => acc.multisigAccountId === issuer)
        .find((acc) => multisigService.isFlexibleMultisigOperation(operation, acc.accountId));

      if (nonNullable(flexibleMultisigAccount)) return flexibleMultisigAccount;

      return allAccounts.filter(accountUtils.isMultisigAccount).find((acc) => acc.accountId === issuer);
    },
  });

  const wallet = useStoreMap({
    store: walletModel.$wallets,
    keys: [multisigAccount],
    fn: (wallets) => {
      if (!multisigAccount) return null;

      if (accountUtils.isFlexibleMultisigAccount(multisigAccount)) {
        return wallets.find((w) =>
          w.accounts.some(
            (acc) => acc.accountId === multisigAccount.accountId && accountUtils.isFlexibleMultisigAccount(acc),
          ),
        );
      }

      return wallets.find((w) => w.accounts.some((acc) => acc.accountId === multisigAccount.accountId));
    },
  });

  const showCoreTransaction = nonNullable(multisigAccount) && accountUtils.isFlexibleMultisigAccount(multisigAccount);
  const coreTx = showCoreTransaction
    ? findCoreTransaction(operation?.transaction ?? null)
    : (operation?.transaction ?? null);

  const asset = useTransactionAsset(coreTx, chainId);
  const amount = coreTx ? getTransactionAmount(coreTx) : null;

  const externalTitle = useTransformer(multisigOperationService.operationTitleTransformer, {
    operation,
    showCoreTransaction: showCoreTransaction,
    chains,
    asset,
    t,
  });

  const titleData: OperationTitle = useMemo(() => {
    if (externalTitle) {
      return externalTitle;
    }

    return {
      title:
        coreTx?.section && coreTx?.method
          ? formatSectionAndMethod(coreTx.section, coreTx.method)
          : t('operations.titles.unknown'),
      amount: asset && amount ? { value: amount, asset } : undefined,
    };
  }, [externalTitle, coreTx, asset, amount, t]);

  const handleViewOperation = () => {
    if (!multisigAccount) return;

    const params = new URLSearchParams({
      chainId,
      callHash,
      accountId: multisigAccount.accountId,
      blockCreated: callTimepoint.height.toString(),
      indexCreated: callTimepoint.index.toString(),
    });

    navigate(`${Paths.OPERATIONS}?${params.toString()}`);
  };

  const icon = iconConfig[status];

  return (
    <div className="flex gap-x-2">
      <div className="pt-0.75">
        <Icon name={icon.name} size={14} className={icon.className} />
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <BodyText>
            <div className="flex items-center justify-start gap-2">
              {titleData.title && <span>{titleData.title}</span>}
              {titleData.amount && <AssetBalance value={titleData.amount.value} asset={titleData.amount.asset} />}
              <span>{t(getOperationStatus(status))}</span>
            </div>
          </BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2 text-text-secondary">
            <Trans
              t={t}
              i18nKey="notifications.details.multisigOperationDetails"
              values={{
                name: wallet?.name || multisigAccount?.name || issuer,
                threshold: multisigAccount?.threshold,
                signatories: multisigAccount?.signatories.length,
              }}
              components={{
                chain: (
                  <span className="mx-2">
                    <ChainTitle chainId={chainId} fontClass="text-text-secondary text-body " />
                  </span>
                ),
                walletIcon: <span className="mr-1">{wallet && <WalletIcon size={16} type={wallet.type} />}</span>,
                wallet: <p className="mx-2 inline-flex" />,
                name: <span className="text-button-large text-text-primary" />,
              }}
            />
          </BodyText>
        </div>
        <div className="self-start">
          <Button size="sm" variant="fill" pallet="secondary" onClick={handleViewOperation}>
            {t('notifications.details.viewOperation')}
          </Button>
        </div>
      </div>
    </div>
  );
};
