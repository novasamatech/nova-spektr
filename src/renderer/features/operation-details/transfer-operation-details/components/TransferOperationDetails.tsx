import { useUnit } from 'effector-react';

import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isXcmTransaction } from '@/entities/transaction';

type Props = {
  operation: MultisigTransaction;
};

export const TransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const transaction = getTransactionFromMultisigTx(operation);

  const result = [];

  const destination = operationDetailsUtils.getDestinationAccountId(operation);

  if (destination) {
    result.push(
      <DetailRow label={t('operation.details.recipient')}>
        <Account accountId={destination} variant="short" chain={chains[operation.chainId]} />
      </DetailRow>,
    );
  }

  const sender = operationDetailsUtils.getSender(operation);
  const destinationChain = operationDetailsUtils.getDestinationChain(operation);

  if (isXcmTransaction(transaction) && sender) {
    result.push(
      <DetailRow label={t('operation.details.sender')} className="text-text-secondary">
        <Account accountId={toAccountId(sender)} variant="short" chain={chains[operation.chainId]} />
      </DetailRow>,
    );
  }

  if (isXcmTransaction(transaction)) {
    result.push(
      <DetailRow label={t('operation.details.fromNetwork')} className="text-text-secondary">
        <ChainTitle chainId={operation.chainId} />
      </DetailRow>,
    );
  }

  if (isXcmTransaction(transaction) && destinationChain) {
    result.push(
      <DetailRow label={t('operation.details.toNetwork')} className="text-text-secondary">
        <ChainTitle chainId={destinationChain} fontClass="text-text-secondary" />
      </DetailRow>,
    );
  }

  return <div>{result}</div>;
};
