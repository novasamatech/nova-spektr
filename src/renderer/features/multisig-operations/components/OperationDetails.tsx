import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { type Chain, type FlexibleMultisigAccount, type MultisigAccount, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DETAIL_ROW_ACCOUNT_ICON_SIZE, DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type MultisigOperation, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { OperationAmount } from '@/widgets/transaction-amount';
import { formatPalletCall } from '../lib/format-pallet-call';
import { type OperationAmountValue } from '../lib/types';

import { OperationDescription } from './OperationDescription';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
  // The row's account and its wallet, exactly as the Submitter cell renders them
  // (the flexible multisig itself when proxied).
  account: MultisigAccount | FlexibleMultisigAccount;
  wallet?: Wallet;
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

export const OperationDetails = ({ operation, account, wallet, amount, children }: Props) => {
  const { t, formatDate } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];

  const approvals = multisigOperationService.getApprovals(operation);
  const initEvent = approvals.find(e => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  // Source is the account the call executes from — the row's account, rendered exactly as the
  // Submitter cell renders it (same wallet, same chain, so a flexible multisig shows as the
  // flexible multisig, not as its pure proxy). The Multisig row names the backing multisig
  // and is shown only when it is a different account — a plain multisig is its own source.
  const multisigAccountId = operation.multisigAccountId;
  const showMultisigRow = multisigAccountId !== account.accountId;
  const sourceChain = accountUtils.isFlexibleMultisigAccount(account) ? chains[account.chainId] : undefined;

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

        {showMultisigRow && (
          <AccountRow label={t('operation.details.multisig')} accountId={multisigAccountId} chain={chain} />
        )}

        <DetailRow label={t('operation.details.source')} className="text-text-secondary">
          <NamedAccount
            accountId={account.accountId}
            chain={sourceChain}
            wallet={wallet}
            variant="short"
            iconSize={DETAIL_ROW_ACCOUNT_ICON_SIZE}
          />
        </DetailRow>

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
