import { useUnit } from 'effector-react';

import { Button, SmallTitleText, Shimmering, SearchInput, Loader, Icon, BodyText, Checkbox } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ValidatorsTable } from '@entities/staking';
import { cnTw } from '@shared/lib/utils';
import { validatorsModel } from '../model/validators-model';

type Props = {
  onGoBack: () => void;
};

export const Validators = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const query = useUnit(validatorsModel.$query);
  const validatorsStore = useUnit(validatorsModel.$validatorsStore);
  const validators = useUnit(validatorsModel.$validators);
  const maxValidators = useUnit(validatorsModel.$maxValidators);
  const selectedValidators = useUnit(validatorsModel.$selectedValidators);
  const selectedAmount = useUnit(validatorsModel.$selectedAmount);
  const isValidatorsLoading = useUnit(validatorsModel.$isValidatorsLoading);
  const canSubmit = useUnit(validatorsModel.$canSubmit);

  if (!validatorsStore) return null;

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
          onChange={validatorsModel.events.queryChanged}
        />
      </div>

      {isValidatorsLoading && (
        <div className="h-[288px] flex items-center justify-center">
          <Loader color="primary" size={25} />
        </div>
      )}

      {!isValidatorsLoading && validators.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-y-4">
          <Icon as="img" name="emptyList" alt={t('staking.validators.noValidatorsLabel')} size={178} />
          <BodyText className="w-52 text-center text-text-tertiary">
            {t('staking.validators.noValidatorsLabel')}
          </BodyText>
        </div>
      )}

      {!isValidatorsLoading && validators.length > 0 && (
        <ValidatorsTable validators={validators}>
          {(validator, rowStyle) => (
            <li key={validator.address} className="pl-5 hover:bg-hover group">
              <Checkbox
                checked={selectedValidators[validator.address]}
                disabled={validator.blocked}
                onChange={() => validatorsModel.events.validatorToggled(validator)}
              >
                <div className={cnTw(rowStyle, 'pl-0 hover:bg-transparent flex-1')}>
                  <ValidatorsTable.Row
                    validator={validator}
                    asset={validatorsStore.asset}
                    explorers={validatorsStore.chain.explorers}
                  />
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
        <Button disabled={!canSubmit} onClick={() => validatorsModel.events.validatorsSubmitted()}>
          {selectedAmount > 0
            ? t('staking.validators.continueButton', { selected: selectedAmount })
            : t('staking.validators.selectValidatorButton')}
        </Button>
      </div>
    </div>
  );
};
