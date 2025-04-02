import { useStoreMap, useUnit } from 'effector-react';
import { memo, useEffect } from 'react';

import { type Address, type ChainId, type Validator } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, getAssetById, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { type AnyDecodedTransaction } from '@/domains/network';
import { identity } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { ValidatorsModal, useValidatorsMap } from '@/entities/staking';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
};

export const ValidatorsOperationDetails = memo(({ transaction, chainId }: Props) => {
  const { t } = useI18n();

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const connections = useUnit(networkModel.$connections);

  const api = apis[chainId];
  const connection = connections[chainId];
  const chain = chains[chainId];
  const defaultAsset = chain?.assets[0];

  const result = [];

  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const identities = useStoreMap({
    store: identity.$list,
    keys: [chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  useEffect(() => {
    const accounts = Object.keys(validatorsMap).map(toAccountId) as AccountId[];

    if (accounts.length === 0) return;

    identity.request({ chainId: chainId, accounts });
  }, [validatorsMap]);

  const allValidators = Object.values(validatorsMap);
  const targets = operationDetailsUtils.getStakingTargets(transaction);

  const startStakingValidators: Address[] = targets || [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (targets || startStakingValidators).includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));
  const validatorsAsset = transaction && getAssetById(transaction.args?.asset, chain?.assets);

  if (Boolean(selectedValidators?.length) && defaultAsset) {
    result.push(
      <>
        <DetailRow label={t('operation.details.validators')} className="text-text-secondary">
          <button
            type="button"
            className={cnTw(
              '-mr-2 flex cursor-pointer items-center gap-x-1 rounded px-2 py-[3px]',
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
          asset={validatorsAsset}
          identities={identities}
          selectedValidators={selectedValidators}
          notSelectedValidators={notSelectedValidators}
          explorers={chain?.explorers}
          onClose={toggleValidators}
        />
      </>,
    );
  }

  return <>{result.map((e) => e)}</>;
});
