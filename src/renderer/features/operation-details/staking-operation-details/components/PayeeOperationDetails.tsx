import { useUnit } from 'effector-react';

import { type AccountId, type MultisigTransaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = {
  operation: MultisigTransaction;
};

export const PayeeOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const result = [];

  const payee = operationDetailsUtils.getPayee(operation);

  if (payee) {
    result.push(
      <DetailRow label={t('operation.details.payee')} className={cnTw({ 'pr-0': typeof payee === 'string' })}>
        {typeof payee === 'string' ? (
          t('staking.confirmation.restakeRewards')
        ) : (
          <Account accountId={payee.Account as AccountId} variant="short" chain={chains[operation.chainId]} />
        )}
      </DetailRow>,
    );
  }

  return <div>{result}</div>;
};
