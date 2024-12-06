import { useUnit } from 'effector-react';

import { chainsService } from '@/shared/api/network';
import {
  type Address,
  type MultisigTransaction,
  type Transaction,
  TransactionType,
  type Validator,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getAssetById } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
import { ValidatorsModal, useValidatorsMap } from '@/entities/staking';

type Props = {
  operation: MultisigTransaction;
};

export const BondOperationDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const connections = useUnit(networkModel.$connections);

  const api = apis[operation.chainId];
  const connection = connections[operation.chainId];
  const chain = chains[operation.chainId];
  const defaultAsset = chain?.assets[0];

  const result = [];

  const transaction = getTransactionFromMultisigTx(operation);
  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const allValidators = Object.values(validatorsMap);

  const startStakingValidators: Address[] =
    (transaction?.type === TransactionType.BATCH_ALL &&
      transaction.args.transactions.find((tx: Transaction) => tx.type === TransactionType.NOMINATE)?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));
  const validatorsAsset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(operation.chainId)?.assets);

  if (Boolean(selectedValidators?.length) && defaultAsset) {
    result.push(
      <>
        <DetailRow label={t('operation.details.validators')}>
          <button type="button" className="flex items-center gap-x-1 text-text-secondary" onClick={toggleValidators}>
            <FootnoteText as="span" className="text-inherit">
              {selectedValidators.length}
            </FootnoteText>
            <Icon name="info" size={16} />
          </button>
        </DetailRow>

        <ValidatorsModal
          isOpen={isValidatorsOpen}
          asset={validatorsAsset}
          selectedValidators={selectedValidators}
          notSelectedValidators={notSelectedValidators}
          explorers={chain?.explorers}
          onClose={toggleValidators}
        />
      </>,
    );
  }

  return <div>{result}</div>;
};
