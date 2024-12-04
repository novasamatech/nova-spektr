import { useUnit } from 'effector-react';

import { type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = {
  operation: MultisigTransaction;
};

export const TransferOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);

  const result = [];

  const destination = operationDetailsUtils.getDestinationAccountId(operation);

  if (destination) {
    result.push(
      <DetailRow label={t('operation.details.recipient')}>
        <Account accountId={destination} variant="short" chain={chains[operation.chainId]} />
      </DetailRow>,
    );
  }

  return <div>{result}</div>;
};
