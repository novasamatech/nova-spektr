import { useUnit } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { type AnyDecodedTransaction } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
};

export const PayeeOperationDetails = ({ transaction, chainId }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const result = [];

  const payee = operationDetailsUtils.getPayee(transaction);

  if (payee) {
    result.push(
      <DetailRow
        label={t('operation.details.payee')}
        className={cnTw('text-text-secondary', { 'pr-0': typeof payee === 'string' })}
      >
        {typeof payee === 'string' ? (
          t('staking.confirmation.restakeRewards')
        ) : (
          <Account accountId={payee.Account as AccountId} variant="short" chain={chains[chainId]} />
        )}
      </DetailRow>,
    );
  }

  return <>{result.map((e) => e)}</>;
};
