import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DETAIL_ROW_ACCOUNT_ICON_SIZE, DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { formatPalletCall } from '../lib/format-pallet-call';
import { type OperationAmountValue } from '../lib/types';

import { OperationDescription } from './OperationDescription';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
  amount?: OperationAmountValue;
}>;

type AccountRowProps = {
  label: string;
  accountId: AccountId;
  chain: Chain | undefined;
};

// `walletNameAs="fallback"`, never `title`: the resolver must reach the account's
// contact or identity name first; the wallet name only fills in where the stored
// name would be a Vault derivation path.
const AccountRow = ({ label, accountId, chain }: AccountRowProps) => (
  <DetailRow label={label} className="text-text-secondary">
    <NamedAccount
      accountId={accountId}
      chain={chain}
      walletNameAs="fallback"
      variant="short"
      iconSize={DETAIL_ROW_ACCOUNT_ICON_SIZE}
    />
  </DetailRow>
);

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

        <AccountRow label={t('operation.details.depositor')} accountId={operation.depositor} chain={chain} />

        <AccountRow label={t('operation.details.multisig')} accountId={multisigAccountId} chain={chain} />

        {sourceAccountId && (
          <AccountRow label={t('operation.details.source')} accountId={sourceAccountId} chain={chain} />
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
