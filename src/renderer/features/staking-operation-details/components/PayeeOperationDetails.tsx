import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = {
  operation: MultisigOperation;
};

export const PayeeOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const result = [];

  const payee = operationDetailsUtils.getPayee(operation);

  if (payee) {
    result.push(
      <DetailRow
        label={t('operation.details.payee')}
        className={cnTw('text-text-secondary', { 'pr-0': typeof payee === 'string' })}
      >
        {typeof payee === 'string' ? (
          t('staking.confirmation.restakeRewards')
        ) : (
          <Account accountId={toAccountId(payee.Account)} variant="short" chain={chains[operation.chainId]} />
        )}
      </DetailRow>,
    );
  }

  return <>{result.map((e) => e)}</>;
};
