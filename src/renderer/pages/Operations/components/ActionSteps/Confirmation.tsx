import { MultisigTransaction, Transaction, Fee } from '@renderer/entities/transaction';
import TransactionAmount from '@renderer/pages/Operations/components/TransactionAmount';
import { DetailRow, FootnoteText } from '@renderer/shared/ui';
import { MultisigAccount } from '@renderer/entities/account';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import Details from '../Details';

const AmountFontStyle = 'font-manrope text-text-primary text-[32px] leading-[36px] font-bold';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  connection: ExtendedChain;
  feeTx?: Transaction;
};
const Confirmation = ({ tx, account, connection, feeTx }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center gap-y-3">
      {tx.transaction && <TransactionAmount tx={tx.transaction} showIcon={false} className={AmountFontStyle} />}

      {tx.description && (
        <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {tx.description}
        </FootnoteText>
      )}

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

export default Confirmation;
