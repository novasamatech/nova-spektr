import { useStoreMap, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Address, type Transaction, TransactionType, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, getAssetByOnChainId, keys, toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { type MultisigOperation, identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { ValidatorsModal, useValidatorsMap } from '@/entities/staking';

type Props = {
  operation: MultisigOperation;
};

export const ValidatorsOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const api = apis[operation.chainId];
  const chain = chains[operation.chainId];
  const defaultAsset = chain?.assets[0];

  const result = [];

  const transaction = operationDetailsUtils.getCoreTx(operation);
  const validatorsMap = useValidatorsMap(api);

  const identities = useStoreMap({
    store: identity.$list,
    keys: [operation.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  useEffect(() => {
    const accounts = keys(validatorsMap).map(toAccountId);

    if (accounts.length === 0) return;

    identity.request({ chainId: operation.chainId, accounts });
  }, [validatorsMap]);

  const allValidators = Object.values(validatorsMap);

  const startStakingValidators: Address[] =
    (transaction?.type === TransactionType.BATCH_ALL &&
      transaction.args.transactions.find((tx: Transaction) => tx.type === TransactionType.NOMINATE)?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.accountId)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.accountId);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.accountId));
  const validatorsAsset = transaction && getAssetByOnChainId(transaction.args.asset, chains[operation.chainId]?.assets);

  if (Boolean(selectedValidators?.length) && defaultAsset) {
    result.push(
      <>
        <DetailRow label={t('operation.details.validators')} className="text-text-secondary">
          <button
            type="button"
            className={cnTw(
              '-mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px]',
              'text-text-secondary hover:bg-action-background-hover hover:text-text-primary',
            )}
            onClick={toggleValidators}
          >
            <FootnoteText as="span" className="text-inherit">
              {selectedValidators.length}
            </FootnoteText>
            <Icon name="info" size={16} />
          </button>
        </DetailRow>

        <ValidatorsModal
          isOpen={isValidatorsOpen}
          asset={validatorsAsset!}
          identities={identities}
          selectedValidators={selectedValidators}
          notSelectedValidators={notSelectedValidators}
          onClose={toggleValidators}
        />
      </>,
    );
  }

  return <>{result.map((e) => e)}</>;
};
