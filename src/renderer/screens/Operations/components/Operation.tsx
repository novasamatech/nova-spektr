import { format } from 'date-fns';
import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import Chain from './Chain/Chain';
import TransactionTitle from './TransactionTitle/TransactionTitle';
import { useToggle } from '@renderer/shared/hooks';
import { MultisigAccount } from '@renderer/domain/account';
import { FootnoteText, IconButton } from '@renderer/components/ui-redesign';
import TransactionAmount from './TransactionAmount';
import { MultisigTransactionDS } from '@renderer/services/storage';
import OperationStatus from './OperationStatus';
import OperationFullInfo from './OperationFullInfo';
import { getTransactionAmount } from '@renderer/screens/Operations/common/utils';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { dateLocale } = useI18n();
  const [isRowShown, toggleRow] = useToggle();
  const { dateCreated, chainId, events, transaction, description, status } = tx;
  const approvals = events.filter((e) => e.status === 'SIGNED');

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      {/* MAIN ROW */}
      <div className="h-[52px] grid grid-cols-operation-card items-center justify-items-start">
        <FootnoteText className="text-text-tertiary pl-6">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        <TransactionTitle tx={transaction} description={description} className="px-2" />
        {transaction && getTransactionAmount(transaction) ? (
          <TransactionAmount tx={transaction} wrapperClassName="px-2" />
        ) : (
          <span />
        )}
        <Chain chainId={chainId} className="px-2" />
        <div className="flex justify-end px-2 w-full">
          <OperationStatus status={status} signed={approvals.length} threshold={account?.threshold || 0} />
        </div>
        <IconButton name={isRowShown ? 'up' : 'down'} className="mx-2" onClick={toggleRow} />
      </div>

      {/* DETAILS */}
      <div className={cn('flex flex-1 border-t border-divider', !isRowShown && 'hidden')}>
        <OperationFullInfo tx={tx} account={account} />
      </div>
    </li>
  );
};

export default Operation;
