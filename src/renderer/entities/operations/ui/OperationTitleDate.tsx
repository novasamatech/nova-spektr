import { useStoreMap } from 'effector-react';

import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { operationsModel } from '../model/operations-model';

type Props = {
  operation: MultisigTransaction;
};

export const OperationTitleDate = ({ operation }: Props) => {
  const { formatDate } = useI18n();

  const events = useStoreMap({
    store: operationsModel.$multisigEvents,
    keys: [operation],
    fn: (events, [operation]) => {
      return events.filter(
        (e) =>
          e.txAccountId === operation.accountId &&
          e.txChainId === operation.chainId &&
          e.txCallHash === operation.callHash &&
          e.txBlock === operation.blockCreated &&
          e.txIndex === operation.indexCreated,
      );
    },
  });
  const approvals = events.filter((e) => e.status === 'SIGNED');
  const initEvent = approvals.find((e) => e.accountId === operation.depositor);
  const date = new Date(operation.dateCreated || initEvent?.dateCreated || Date.now());

  return (
    <div className="w-[58px] pr-1">
      <FootnoteText className="text-text-tertiary" align="right">
        {formatDate(date, 'p')}
      </FootnoteText>
    </div>
  );
};
