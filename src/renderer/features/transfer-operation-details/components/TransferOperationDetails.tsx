import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isXcmTransaction } from '@/entities/transaction';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  operation: MultisigOperation;
};

export const TransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const transaction = operation.transaction ?? undefined;
  const result = [];

  const destination = operationDetailsUtils.getDestinationAccountId(operation);
  const sender = operationDetailsUtils.getSender(operation);
  const destinationChain = operationDetailsUtils.getDestinationChain(operation);

  if (destination) {
    result.push(
      <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
        <NamedAccount accountId={destination} variant="short" chain={chains[operation.chainId]} />
      </DetailRow>,
    );
  }

  if (isXcmTransaction(transaction) && sender) {
    result.push(
      <DetailRow label={t('operation.details.sender')} className="text-text-secondary">
        <NamedAccount accountId={sender} variant="short" chain={chains[operation.chainId]} />
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

  return <>{result.map((e) => e)}</>;
};
