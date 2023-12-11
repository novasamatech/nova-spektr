import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';
import { mapValues } from 'lodash';

import { Icon, Shimmering, Loader, BodyText, Button, SearchInput, SmallTitleText, Checkbox } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ValidatorMap, validatorsService, useValidatorsMap, ValidatorsTable } from '@entities/staking';
import { includes, cnTw } from '@shared/lib/utils';
import type { Asset, Explorer, Address, ChainId } from '@shared/core';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  isLightClient?: boolean;
  onGoBack: () => void;
  onResult: (validators: ValidatorMap) => void;
};

export const Validators = ({ api, asset, explorers, isLightClient, onGoBack, onResult }: Props) => {
  const { t } = useI18n();
  const validators = useValidatorsMap(api, isLightClient);

  const [isValidatorsLoading, setIsValidatorsLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [maxValidators, setMaxValidators] = useState(0);
  const [selectedValidators, setSelectedValidators] = useState<Record<Address, boolean>>({});

  useEffect(() => {
    if (Object.values(validators).length) {
      setMaxValidators(validatorsService.getMaxValidators(api));
      setIsValidatorsLoading(false);
      setSelectedValidators(mapValues(validators, () => false));
    }
  }, [validators]);

  const validatorList = Object.values(validators).filter((validator) => {
    const addressMatch = includes(validator.address, query);
    const identityMatch = includes(validator.identity?.subName, query);
    const subIdentityMatch = includes(validator.identity?.parent.name, query);

    return addressMatch || identityMatch || subIdentityMatch;
  });

  const toggleSelectedValidators = (address: Address) => {
    setSelectedValidators((validators) => ({ ...validators, [address]: !validators[address] }));
  };

  const onCompleteValidators = () => {
    const finalValidators = Object.entries(selectedValidators).reduce<ValidatorMap>((acc, [address, flag]) => {
      if (flag) acc[address] = validators[address];

      return acc;
    }, {});

    onResult(finalValidators);
  };

  const selectedLength = Object.values(selectedValidators).reduce((acc, v) => acc + Number(v), 0);
  const nextStepDisabled = !selectedLength || selectedLength > maxValidators;

  return (
    <div className="w-[784px] max-h-[660px] py-4">
      <div className="flex items-center gap-x-1 px-5">
        <SmallTitleText as="p">{t('staking.validators.selectedValidatorsLabel')}</SmallTitleText>
        {isValidatorsLoading ? (
          <Shimmering className="ml-1" width={70} height={16} />
        ) : (
          <SmallTitleText as="p" className="text-text-tertiary">
            {t('staking.validators.maxValidatorsLabel', { max: maxValidators })}
          </SmallTitleText>
        )}
        <SearchInput
          wrapperClass="w-[220px] ml-auto"
          placeholder={t('staking.validators.searchPlaceholder')}
          value={query}
          onChange={setQuery}
        />
      </div>

      {isValidatorsLoading && (
        <div className="h-[288px] flex items-center justify-center">
          <Loader color="primary" size={25} />
        </div>
      )}

      {!isValidatorsLoading && validatorList.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-y-4">
          <Icon as="img" name="emptyList" alt={t('staking.validators.noValidatorsLabel')} size={178} />
          <BodyText className="w-52 text-center text-text-tertiary">
            {t('staking.validators.noValidatorsLabel')}
          </BodyText>
        </div>
      )}

      {!isValidatorsLoading && validatorList.length > 0 && (
        <ValidatorsTable validators={validatorList}>
          {(validator, rowStyle) => (
            <li key={validator.address} className="pl-5 hover:bg-hover group">
              <Checkbox
                checked={selectedValidators[validator.address]}
                disabled={validator.blocked}
                onChange={() => toggleSelectedValidators(validator.address)}
              >
                <div className={cnTw(rowStyle, 'pl-0 hover:bg-transparent flex-1')}>
                  <ValidatorsTable.Row validator={validator} asset={asset} explorers={explorers} />
                </div>
              </Checkbox>
            </li>
          )}
        </ValidatorsTable>
      )}

      <div className="flex justify-between mt-7 px-5">
        <Button variant="text" onClick={onGoBack}>
          {t('staking.bond.backButton')}
        </Button>
        <Button disabled={nextStepDisabled} onClick={onCompleteValidators}>
          {selectedLength
            ? t('staking.validators.continueButton', { selected: selectedLength })
            : t('staking.validators.selectValidatorButton')}
        </Button>
      </div>
    </div>
  );
};
