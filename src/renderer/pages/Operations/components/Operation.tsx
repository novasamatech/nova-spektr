import { useUnit } from 'effector-react';

import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Accordion, FootnoteText } from '@/shared/ui';
import { operationsModel } from '@/entities/operations';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { OperationFullInfo } from './OperationFullInfo';
import { Status } from './Status';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account?: MultisigAccount | FlexibleMultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { formatDate } = useI18n();

  const events = useUnit(operationsModel.$multisigEvents);
  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
  const initEvent = approvals.find((e) => e.accountId === tx.depositor);
  const date = new Date(tx.dateCreated || initEvent?.dateCreated || Date.now());

  const operationTitle = useSlot(multisigOperationsFeature.slots.operationTitle, {
    props: {
      operation: tx,
    },
  });

  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden">
          <div className="w-[58px] pr-1">
            <FootnoteText className="text-text-tertiary" align="right">
              {formatDate(date, 'p')}
            </FootnoteText>
          </div>

          {operationTitle}

          <div className="flex w-[120px] justify-end">
            <Status status={tx.status} signed={approvals.length} threshold={account?.threshold || 0} />
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
