import { MultisigTransaction, Transaction } from '@renderer/domain/transaction';
import TransactionAmount from '@renderer/screens/Operations/components/TransactionAmount';
import { FootnoteText } from '@renderer/components/ui-redesign';
import { Fee } from '@renderer/components/common';
import { MultisigAccount } from '@renderer/domain/account';
import { ExtendedChain } from '@renderer/services/network/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import DetailWithLabel from '../DetailWithLabel';
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

      <Details tx={tx} account={account} connection={connection} withAdvanced={false} />

      <hr className="border-divider my-1 w-full" />

      <DetailWithLabel label={t('operation.networkFee')} className="text-text-primary">
        {connection.api && feeTx && (
          <Fee
            className="text-footnote text-text-primary"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={feeTx}
          />
        )}
      </DetailWithLabel>
    </div>
  );
};

export default Confirmation;
