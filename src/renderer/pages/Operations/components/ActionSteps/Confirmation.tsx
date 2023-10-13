import { MultisigTransaction, Transaction, Fee } from '@renderer/entities/transaction';
import { TransactionAmount } from '@renderer/pages/Operations/components/TransactionAmount';
import { DetailRow, FootnoteText, Icon } from '@renderer/shared/ui';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { getIconName } from '../../common/utils';
import type { MultisigAccount } from '@renderer/shared/core';
import Details from '../Details';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  connection: ExtendedChain;
  feeTx?: Transaction;
};
export const Confirmation = ({ tx, account, connection, feeTx }: Props) => {
  const { t } = useI18n();

  const iconName = getIconName(tx.transaction);

  return (
    <div className="flex flex-col items-center gap-y-3">
      <div className="flex flex-col items-center gap-y-3 mb-6">
        <div className="flex items-center justify-center w-15 h-15 box-content rounded-full border-2 border-icon-default">
          <Icon className="text-icon-default" name={iconName} size={42} />
        </div>

        {tx.transaction && <TransactionAmount tx={tx.transaction} />}

        {tx.description && (
          <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
            {tx.description}
          </FootnoteText>
        )}
      </div>

      <Details tx={tx} account={account} connection={connection} isCardDetails={false} />

      <hr className="border-divider my-1 w-full" />

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {connection.api && feeTx && (
          <Fee
            className="text-footnote text-text-primary"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={feeTx}
          />
        )}
      </DetailRow>
    </div>
  );
};
