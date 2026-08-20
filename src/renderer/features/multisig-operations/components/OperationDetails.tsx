import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { formatPalletCall } from '../lib/format-pallet-call';

import { type OperationAmountValue } from './Operation';
import { OperationDescription } from './OperationDescription';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
  amount?: OperationAmountValue;
}>;

export const OperationDetails = ({ operation, amount, children }: Props) => {
  const { t, formatDate } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];

  const approvals = multisigOperationService.getApprovals(operation);
  const initEvent = approvals.find(e => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  // Both ids are recorded on the operation at ingest; a Source exists only when the call really is proxied.
  const multisigAccountId = operation.multisigAccountId;
  const sourceAccountId = operation.proxiedAccountId;

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

        <DetailRow label={t('operation.details.depositor')} className="text-text-secondary">
          <NamedAccount accountId={operation.depositor} chain={chain} variant="short" />
        </DetailRow>

        <DetailRow label={t('operation.details.multisig')} className="text-text-secondary">
          <NamedAccount accountId={multisigAccountId} chain={chain} variant="short" />
        </DetailRow>

        {sourceAccountId && (
          <DetailRow label={t('operation.details.source')} className="text-text-secondary">
            <NamedAccount accountId={sourceAccountId} chain={chain} variant="short" />
          </DetailRow>
        )}

        {children}

        {palletCall && (
          <DetailRow label={t('operation.details.operationType')}>
            <FootnoteText
              as="span"
              className="min-w-0 truncate rounded-md bg-tab-background px-2 py-0.5 font-mono text-text-primary"
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
