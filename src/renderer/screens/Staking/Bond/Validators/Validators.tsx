import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useState } from 'react';

import { ValidatorsTable } from '@renderer/components/common';
import { Button, Icon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { ValidatorMap } from '@renderer/services/staking/common/types';
import { useEra } from '@renderer/services/staking/eraService';
import { useValidators } from '@renderer/services/staking/validatorsService';

type Props = {
  api?: ApiPromise;
  chainId?: ChainId;
  asset?: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onResult: (validators: ValidatorMap) => void;
};

const Validators = ({ api, chainId, asset, explorers, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();
  const { getMaxValidators, getValidators } = useValidators();
  const { subscribeActiveEra } = useEra();

  const [era, setEra] = useState<number>();
  const [validators, setValidators] = useState<ValidatorMap>({});

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState<number>(0);
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

  const validatorList = Object.values(validators).filter((validator) => {
    const addressMatch = validator.address?.toLowerCase().includes(query.toLowerCase());
    const identityMatch = validator.identity?.subName.toLowerCase().includes(query.toLowerCase());
    const subIdentityMatch = validator.identity?.parent.name.toLowerCase().includes(query.toLowerCase());

    return addressMatch || identityMatch || subIdentityMatch;
  });

  const pushSelectedValidators = () => {
    const finalValidators = selectedValidators.reduce<ValidatorMap>((acc, address) => {
      acc[address] = validators[address];

      return acc;
    }, {});

    onResult(finalValidators);
  };

  const validatorsLoading = !api || !chainId || !maxValidators;
  const validatorsAreSelected = selectedValidators.length > 0;
  const nextStepDisabled = selectedValidators.length === 0 || selectedValidators.length > maxValidators;

  return (
    <div className="overflow-y-scroll">
      <section className="flex flex-col gap-y-5 w-[900px] p-5 mb-28 mx-auto bg-shade-2 rounded-2lg">
        <div className="flex justify-between">
          <Input
            wrapperClass="!bg-shade-5 w-[300px]"
            placeholder={t('staking.validators.searchPlaceholder')}
            prefixElement={<Icon name="search" className="w-5 h-5" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* TODO: implement in future */}
          {/*<Filter*/}
          {/*  placeholder={t('staking.validators.filterButton')}*/}
          {/*  activeIds={[]}*/}
          {/*  options={[]}*/}
          {/*  onChange={() => {}}*/}
          {/*/>*/}
        </div>

        <ValidatorsTable
          className="shadow-surface"
          dataIsLoading={validatorsLoading}
          validators={validatorList}
          columns={['ownStake', 'totalStake']}
          asset={asset}
          explorers={explorers}
          addressPrefix={addressPrefix}
          onSelect={setSelectedValidators}
        />

        {!validatorsLoading && (
          <div
            className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2 p-5',
              'shadow-surface bg-white rounded-2lg border border-shade-10',
            )}
          >
            <Button
              variant="fill"
              pallet="primary"
              weight="lg"
              disabled={nextStepDisabled}
              onClick={pushSelectedValidators}
            >
              {validatorsAreSelected
                ? t('staking.validators.continueButton', { selected: selectedValidators.length, max: maxValidators })
                : t('staking.validators.selectValidatorButton')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Validators;
