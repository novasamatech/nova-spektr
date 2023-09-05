import { format } from 'date-fns';

import { useI18n } from '@renderer/app/providers';
import { TransactionTitle } from './TransactionTitle/TransactionTitle';
import { MultisigAccount } from '@renderer/entities/account';
import { FootnoteText, Accordion } from '@renderer/shared/ui';
import { TransactionAmount } from './TransactionAmount';
import OperationStatus from './OperationStatus';
import OperationFullInfo from './OperationFullInfo';
import { MultisigTransactionDS } from '@renderer/shared/api/storage';
import { useMultisigEvent } from '@renderer/entities/multisig';
import { ChainTitle } from '@renderer/entities/chain';
import { getTransactionAmount } from '../common/utils';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { dateLocale } = useI18n();

  const { getLiveEventsByKeys } = useMultisigEvent({});
  const events = getLiveEventsByKeys([tx]);

  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
  const initEvent = approvals.find((e) => e.accountId === tx.depositor);
  const date = new Date(tx.dateCreated || initEvent?.dateCreated || Date.now());

  return (
    <Accordion className="bg-block-background-default transition-shadow rounded hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="h-[52px] flex gap-x-4 items-center w-full overflow-hidden">
          <div className="w-[62px] pr-2">
            <FootnoteText className="text-text-tertiary" align="right">
              {format(date, 'p', { locale: dateLocale })}
            </FootnoteText>
          </div>

          <TransactionTitle
            truncate
            className="flex-1 overflow-hidden"
            tx={tx.transaction}
            description={tx.description}
          />

          {tx.transaction && getTransactionAmount(tx.transaction) && (
            <TransactionAmount wrapperClassName="w-[166px]" tx={tx.transaction} />
          )}

          <ChainTitle chainId={tx.chainId} className="w-[114px]" />

          <div className="flex justify-end w-[114px]">
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
