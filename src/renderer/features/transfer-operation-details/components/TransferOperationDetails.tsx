import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { UnknownRecipientAlert } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isXcmTransaction } from '@/entities/transaction';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { NamedAccount } from '@/widgets/NameResolver';

type Props = {
  operation: MultisigOperation;
};

export const TransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const resolveRecipientWarning = useUnit(recipientVerificationModel.$resolveWarning);

  const transaction = operation.transaction ?? undefined;
  const result = [];

  const destination = operationDetailsUtils.getDestinationAccountId(operation);
  const sender = operationDetailsUtils.getSender(operation);
  const destinationChain = operationDetailsUtils.getDestinationChain(operation);

  const chain = chains[operation.chainId];

  if (destination) {
    const recipientWarning = resolveRecipientWarning(destination);

    result.push(
      <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
        <NamedAccount accountId={destination} variant="short" chain={chain} />
      </DetailRow>,
    );

    if (recipientWarning !== 'none') {
      result.push(<UnknownRecipientAlert warning={recipientWarning} variant="review" />);
    }
  }

  if (isXcmTransaction(transaction) && sender) {
    result.push(
      <DetailRow label={t('operation.details.sender')} className="text-text-secondary">
        <NamedAccount accountId={sender} variant="short" chain={chain} />
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
