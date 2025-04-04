import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { type AnyDecodedTransaction } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isXcmTransaction } from '@/entities/transaction';

type Props = {
  transaction: AnyDecodedTransaction;
  multisigAccountId: AccountId;
  chainId: ChainId;
};

export const TransferOperationDetails = ({ transaction, chainId, multisigAccountId }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const result = [];

  const destination = operationDetailsUtils.getDestination(transaction);
  const sender = multisigAccountId;
  const destinationChain = operationDetailsUtils.getDestinationChain(transaction);

  if (destination) {
    result.push(
      <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
        <Account accountId={destination} variant="short" chain={chains[chainId]} />
      </DetailRow>,
    );
  }

  if (isXcmTransaction(transaction) && sender) {
    result.push(
      <DetailRow label={t('operation.details.sender')} className="text-text-secondary">
        <Account accountId={sender} variant="short" chain={chains[chainId]} />
      </DetailRow>,
    );
  }

  if (isXcmTransaction(transaction)) {
    result.push(
      <DetailRow label={t('operation.details.fromNetwork')} className="text-text-secondary">
        <ChainTitle chainId={chainId} />
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
