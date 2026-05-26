import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, SmallTitleText } from '@/shared/ui';
import { AccountExplorers, WalletIcon } from '@/shared/ui-entities';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation, accounts, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
}>;

export const OperationDetails = ({ operation, children }: Props) => {
  const { t, formatDate } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];
  const allAccounts = useUnit(accounts.$list);
  const description = useOperationDescription(operation.id);

  const depositorSignatory = allAccounts.find(a => a.accountId === operation.depositor);
  const depositorWallet = depositorSignatory && wallets.find(w => w.id === depositorSignatory.walletId);

  const approvals = multisigOperationService.getApprovals(operation);
  const initEvent = approvals.find(e => e.accountId === operation.depositor);
  const date = new Date(operation.timestamp || initEvent?.timestamp || Date.now());

  return (
    <div className="flex flex-col gap-y-4 border-r border-divider p-4">
      <SmallTitleText>{t('operation.detailsTitle')}</SmallTitleText>

      <div className="flex flex-col gap-y-2">
        {depositorSignatory && nonNullable(chain) && (
          <DetailRow label={t('operation.details.depositor')} className="text-text-secondary">
            {depositorWallet ? (
              <div className="flex items-center gap-2">
                <WalletIcon size={16} type={depositorWallet.type} />
                <span>{depositorWallet.name}</span>
                <AccountExplorers accountId={depositorSignatory.accountId} chain={chain} />
              </div>
            ) : (
              <div className="flex min-w-min">
                <FootnoteText className="text-text-secondary">
                  <NamedAccount accountId={depositorSignatory.accountId} chain={chain} variant="short" />
                </FootnoteText>
              </div>
            )}
          </DetailRow>
        )}

        {children}

        <DetailRow label={t('operation.details.dateTime')}>
          <span>{formatDate(date, 'PPp')}</span>
        </DetailRow>

        {description && (
          <DetailRow label={t('operation.descriptionLabel')} wrapperClassName="items-start">
            <FootnoteText className="text-text-secondary">{description}</FootnoteText>
          </DetailRow>
        )}
      </div>
    </div>
  );
};
