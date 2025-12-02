import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type MultisigOperationNotification } from '@/shared/core';
import { useTransformer } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { BodyText, Button, Icon } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { accounts, multisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { deepLinkModel, operationTitleTransformer } from '@/features/multisig-operations';
import { multisigService } from '@/features/multisig-wallet';

type Props = {
  notification: MultisigOperationNotification;
};

export const MultisigOperationNotificationComponent = ({
  notification: { callHash, callTimepoint, chainId, multisigAccountId, operationStatus, operationId },
}: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const allAccounts = useUnit(accounts.$list);
  const operations = useUnit(multisigOperation.$list);
  const wallets = useUnit(walletModel.$wallets);

  const operation = useMemo(() => operations.find((op) => op.id === operationId), [operations, operationId]);

  const multisigAccount = useMemo(
    () =>
      allAccounts
        .filter(accountUtils.isAnyMultisigAccount)
        .find((acc) => multisigService.getMultisigAccountId(acc) === multisigAccountId),
    [allAccounts, multisigAccountId],
  );

  const wallet = useMemo(
    () => wallets.find((w) => multisigAccount && w.accounts.some((acc) => acc.accountId === multisigAccount.accountId)),
    [wallets, multisigAccount],
  );

  const showCoreTransaction = multisigAccount && accountUtils.isFlexibleMultisigAccount(multisigAccount);

  const operationTitle = operation
    ? useTransformer(operationTitleTransformer, {
        operation,
        showCoreTransaction,
      })
    : null;

  const transaction = useMemo(() => {
    if (!operation || !multisigAccount) return null;
    return showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
  }, [operation, multisigAccount, showCoreTransaction]);

  const amount = useMemo(() => (transaction ? getTransactionAmount(transaction) : null), [transaction]);
  const asset = useTransactionAsset(transaction, chainId);
  const formattedAmount = asset && amount ? formatBalance(amount, asset.precision) : null;

  const handleViewOperation = () => {
    if (!multisigAccount) return;

    const deepLink = deepLinkModel.generateMultisigOperationDeepLink(
      {
        chainId,
        callHash,
        accountId: multisigAccount.accountId,
        blockCreated: callTimepoint.height,
        indexCreated: callTimepoint.index,
      },
      multisigAccount.accountId,
      { includeOrigin: false },
    );

    navigate(deepLink);
  };

  const amountNode =
    formattedAmount && asset ? (
      <span>
        {formattedAmount.value}
        {formattedAmount.suffix} {asset.symbol}
      </span>
    ) : null;

  const iconConfig = {
    created: { name: 'info' as const, className: 'text-icon-accent' },
    executed: { name: 'checkmarkOutline' as const, className: 'text-icon-positive' },
    cancelled: { name: 'closeOutline' as const, className: 'text-icon-negative' },
    error: { name: 'closeOutline' as const, className: 'text-icon-negative' },
  };

  const icon = iconConfig[operationStatus];

  return (
    <div className="flex gap-x-2">
      <div className="pt-0.75">
        <Icon name={icon.name} size={14} className={icon.className} />
      </div>

      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <BodyText>
            <div className="flex items-center justify-start gap-2">
              <div className="inline">{operationTitle?.name}</div>
              {amountNode}
            </div>
          </BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2 text-text-secondary">
            <Trans
              t={t}
              i18nKey="notifications.details.multisigOperationDetails"
              values={{
                name: wallet?.name || multisigAccount?.name || multisigAccountId,
                threshold: multisigAccount?.threshold,
                signatories: multisigAccount?.signatories.length,
              }}
              components={{
                chain: <ChainTitle chainId={chainId} fontClass="text-text-secondary text-body" />,
                walletIcon: <span className="mx-1">{wallet && <WalletIcon size={16} type={wallet.type} />}</span>,
                wallet: <p className="inline-flex" />,
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
