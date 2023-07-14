import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import TransactionTitle from './TransactionTitle/TransactionTitle';
import { MultisigAccount } from '@renderer/domain/account';
import { FootnoteText, Chain, Accordion } from '@renderer/components/ui-redesign';
import TransactionAmount from './TransactionAmount';
import OperationStatus from './OperationStatus';
import OperationFullInfo from './OperationFullInfo';
import { getTransactionAmount } from '@renderer/screens/Operations/common/utils';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { useMultisigEvent } from '@renderer/services/multisigEvent/multisigEventService';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { dateLocale } = useI18n();

  const { getLiveEventsByKeys } = useMultisigEvent();
  const events = getLiveEventsByKeys([tx]);

  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
  const initEvent = approvals.find((e) => e.accountId === tx.depositor);

  return (
    <Accordion className="bg-block-background-default transition-shadow rounded hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button className="px-2">
        <div className="h-[52px] grid grid-cols-operation-card items-center justify-items-start">
          <FootnoteText className="text-text-tertiary pl-6">
            {format(new Date(tx.dateCreated || initEvent?.dateCreated || Date.now()), 'p', { locale: dateLocale })}
          </FootnoteText>
          <TransactionTitle tx={tx.transaction} description={tx.description} className="px-2" />
          {tx.transaction && getTransactionAmount(tx.transaction) ? (
            <TransactionAmount tx={tx.transaction} wrapperClassName="px-2" />
          ) : (
            <span />
          )}
          <Chain chainId={tx.chainId} className="px-2" />
          <div className="flex justify-end px-2 w-full">
            <OperationStatus status={tx.status} signed={approvals.length} threshold={account?.threshold || 0} />
          </div>
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo tx={tx} account={account} />
      </Accordion.Content>
    </Accordion>
  );
};

export default Operation;
