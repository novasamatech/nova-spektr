/* eslint-disable i18next/no-literal-string */
import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Address, Balance, BaseModal, Button, Filter, Icon, Input, Table } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import useToggle from '@renderer/hooks/useToggle';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useEra } from '@renderer/services/staking/eraService';
import { useValidators } from '@renderer/services/staking/validatorsService';
import { getComposedIdentity } from '@renderer/utils/strings';

type Props = {
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  onResult: (validators: Validator[]) => void;
};

const Validators = ({ api, chainId, asset, onResult }: Props) => {
  const { t } = useI18n();
  const [isInfoOpen, toggleInfo] = useToggle();
  const { getMaxValidators, getValidators } = useValidators();
  const { subscribeActiveEra } = useEra();

  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState<number>();
  const [selectedValidators, setSelectedValidators] = useState<AccountID[]>([]);

  useEffect(() => {
    if (!chainId || !api?.isConnected) return;

    let unsubEra: () => void | undefined;
    (async () => {
      unsubEra = await subscribeActiveEra(api, setEra);
    })();

    return () => {
      unsubEra?.();
    };
  }, [api]);

  useEffect(() => {
    if (!chainId || !api?.isConnected || !era) return;

    (async () => {
      const validators = await getValidators(chainId, api, era);
      setValidators(validators);
      setMaxValidators(getMaxValidators(api));
    })();
  }, [api, era]);

  if (!api || !chainId || !asset || !maxValidators) {
    return <div>LOADING</div>;
  }

  const validatorList = Object.values(validators).filter((validator) => {
    // TODO: add filter

    const addressMatch = validator.address?.toLowerCase().includes(query.toLowerCase());
    const identityMatch = validator.identity?.subName.toLowerCase().includes(query.toLowerCase());
    const subIdentityMatch = validator.identity?.parent.name.toLowerCase().includes(query.toLowerCase());

    return addressMatch || identityMatch || subIdentityMatch;
  });

  return (
    <>
      <div className="flex justify-between">
        <Input
          wrapperClass="!bg-shade-5 w-[300px]"
          placeholder={t('staking.validators.searchPlaceholder')}
          prefixElement={<Icon name="search" className="w-5 h-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Filter placeholder={t('staking.validators.filterButton')} activeIds={[]} options={[]} onChange={() => {}} />
      </div>

      <Table
        by="address"
        className="mt-5"
        dataSource={validatorList}
        selectedKeys={selectedValidators}
        onSelect={setSelectedValidators}
      >
        <Table.Header>
          <Table.Column dataKey="address" align="left">
            {t('staking.validators.validatorsTableHeader')}
            <span className="ml-1 px-1.25 py-1 rounded-md bg-shade-2 text-shade-40">{validatorList.length}</span>
          </Table.Column>
          <Table.Column dataKey="rewards" width={130} sort>
            {t('staking.validators.rewardsTableHeader')}
          </Table.Column>
          <Table.Column dataKey="ownStake" width={150}>
            {t('staking.validators.ownStakeTableHeader')}
          </Table.Column>
          <Table.Column dataKey="totalStake" width={150}>
            {t('staking.validators.totalStakeTableHeader')}
          </Table.Column>
          <Table.Column dataKey="actions" width={50} />
        </Table.Header>
        <Table.Body<Validator>>
          {({ address, identity, apy, ownStake, totalStake }) => (
            <Table.Row key={address}>
              <Table.Cell>
                <div className="flex flex-col justify-center ml-2.5">
                  {identity && <p className="text-sm font-semibold">{getComposedIdentity(identity)}</p>}
                  <Address
                    canCopy={false}
                    address={address || ''}
                    type="short"
                    addressStyle={identity ? 'small' : 'normal'}
                    size={identity ? 12 : 14}
                    symbols={16}
                  />
                </div>
                {/*TODO: add slashed / oversubscribed*/}
              </Table.Cell>
              <Table.Cell className="text-sm font-semibold text-success">{apy}%</Table.Cell>
              <Table.Cell className="text-sm font-semibold">
                <Balance value={ownStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              </Table.Cell>
              <Table.Cell className="text-sm font-semibold">
                <Balance value={totalStake || '0'} precision={asset.precision} symbol={asset.symbol} />
              </Table.Cell>
              <Table.Cell>
                <button className="px-1" type="button" onClick={toggleInfo}>
                  •••
                </button>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>

      {selectedValidators.length > 0 && (
        <div className="absolute bottom-0 py-2.5 w-full bg-white/75 backdrop-blur-[2px]">
          <Button
            className="mx-auto w-[232px]"
            variant="fill"
            pallet="primary"
            weight="lg"
            disabled={selectedValidators.length !== maxValidators}
            // onClick={() => onResult(selectedValidators)}
          >
            {selectedValidators.length !== maxValidators
              ? `Validators ${selectedValidators.length} / ${maxValidators}`
              : 'Continue'}
          </Button>
        </div>
      )}

      <BaseModal isOpen={isInfoOpen} onClose={toggleInfo}>
        Validator&apos;s info
      </BaseModal>
    </>
  );
};

export default Validators;
