import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { formatPalletCall } from '../lib/format-pallet-call';

import { type OperationAmountValue } from './Operation';
import { OperationDescription } from './OperationDescription';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
  amount?: OperationAmountValue;
}>;

const ACCOUNT_ROW_CLASS = 'text-text-secondary';

export const OperationDetails = ({ operation, account, amount, children }: Props) => {
  const { t, formatDate } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];

  const approvals = multisigOperationService.getApprovals(operation);
  const initEvent = approvals.find(e => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  // Flexible multisig: `account` is the proxied (pure) account, the backing multisig
  // is `multisigAccountId`. Regular multisig: `account` IS the multisig and a proxied
  // operation carries the source in `operation.proxiedAccountId`.
  const multisigAccountId = accountUtils.isFlexibleMultisigAccount(account)
    ? account.multisigAccountId
    : account.accountId;
  const sourceAccountId = accountUtils.isFlexibleMultisigAccount(account)
    ? account.accountId
    : operation.proxiedAccountId;

  // Proxy wrappers are unwrapped so the chip names the call a signer is actually
  // authorising; the raw section/method fallback covers undecoded operations.
  const coreTx = findCoreTransaction(operation.transaction);
  const palletCall = formatPalletCall(coreTx?.section ?? operation.section, coreTx?.method ?? operation.method);

  return (
    <div className="flex flex-col gap-y-4 border-r border-divider p-4">
      <SmallTitleText>{t('operation.detailsTitle')}</SmallTitleText>

      <div className="flex flex-col gap-y-2">
        <DetailRow label={t('operation.details.dateTime')}>
          <span>{formatDate(date, 'PPp')}</span>
        </DetailRow>

        {nonNullable(chain) && (
          <DetailRow label={t('operation.details.depositor')} className={ACCOUNT_ROW_CLASS}>
            <NamedAccount accountId={operation.depositor} chain={chain} variant="short" />
          </DetailRow>
        )}

        {nonNullable(chain) && (
          <DetailRow label={t('operation.details.multisig')} className={ACCOUNT_ROW_CLASS}>
            <NamedAccount accountId={multisigAccountId} chain={chain} variant="short" />
          </DetailRow>
        )}

        {nonNullable(chain) && sourceAccountId && (
          <DetailRow label={t('operation.details.source')} className={ACCOUNT_ROW_CLASS}>
            <NamedAccount accountId={sourceAccountId} chain={chain} variant="short" />
          </DetailRow>
        )}

        {children}

        {palletCall && (
          <DetailRow label={t('operation.details.operationType')}>
            <FootnoteText
              as="span"
              className="truncate rounded-md bg-tab-background px-2 py-0.5 font-mono text-text-primary"
            >
              {palletCall}
            </FootnoteText>
          </DetailRow>
        )}

        {amount && (
          <DetailRow label={t('operation.details.amount')}>
            <OperationAmount value={amount.value} asset={amount.asset} iconSize={22} />
          </DetailRow>
        )}

        <OperationDescription operation={operation} chain={chain} />
      </div>
    </div>
  );
};
