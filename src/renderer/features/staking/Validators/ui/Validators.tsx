import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@app/providers';

import { type Validator } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { BodyText, Button, Checkbox, Icon, Loader, SearchInput, Shimmering, SmallTitleText } from '@shared/ui';

import { ValidatorsTable } from '@entities/staking';

import { validatorsModel } from '../model/validators-model';

type Props = {
  onGoBack: () => void;
};

export const Validators = ({ onGoBack }: Props) => {
  return (
    <div className="w-[784px] max-h-[660px] py-4">
      <Header />
      <Spinner />
      <NoValidators />
      <ValidatorsList />

      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Header = () => {
  const { t } = useI18n();

  const query = useUnit(validatorsModel.$query);
  const maxValidators = useUnit(validatorsModel.$maxValidators);
  const isValidatorsLoading = useUnit(validatorsModel.$isValidatorsLoading);

  return (
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
  );
};

const Spinner = () => {
  const isValidatorsLoading = useUnit(validatorsModel.$isValidatorsLoading);

  if (!isValidatorsLoading) {
    return null;
  }

  return (
    <div className="h-[288px] flex items-center justify-center">
      <Loader color="primary" size={25} />
    </div>
  );
};

const NoValidators = () => {
  const { t } = useI18n();

  const validators = useUnit(validatorsModel.$validators);
  const isValidatorsLoading = useUnit(validatorsModel.$isValidatorsLoading);

  if (isValidatorsLoading || validators.length > 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-y-4">
      <Icon as="img" name="emptyList" alt={t('staking.validators.noValidatorsLabel')} size={178} />
      <BodyText className="w-52 text-center text-text-tertiary">{t('staking.validators.noValidatorsLabel')}</BodyText>
    </div>
  );
};

const ValidatorsList = () => {
  const validators = useUnit(validatorsModel.$validators);
  const isValidatorsLoading = useUnit(validatorsModel.$isValidatorsLoading);
  const selectedValidators = useUnit(validatorsModel.$selectedValidators);

  if (isValidatorsLoading || validators.length === 0) {
    return null;
  }

  return (
    <ValidatorsTable validators={validators}>
      {(validator, rowStyle) => (
        <RowItem
          key={validator.address}
          validator={validator}
          rowStyle={rowStyle}
          isChecked={Boolean(selectedValidators[validator.address])}
        />
      )}
    </ValidatorsTable>
  );
};

type RowProps = {
  validator: Validator;
  rowStyle: string;
  isChecked: boolean;
};
const RowItem = memo(({ validator, rowStyle, isChecked }: RowProps) => {
  const chain = useUnit(validatorsModel.$chain);
  const asset = useUnit(validatorsModel.$asset);

  return (
    <li className="pl-5 hover:bg-hover group">
      <Checkbox
        checked={isChecked}
        disabled={validator.blocked}
        onChange={() => validatorsModel.events.validatorToggled(validator)}
      >
        <div className={cnTw(rowStyle, 'pl-0 hover:bg-transparent flex-1')}>
          <ValidatorsTable.Row validator={validator} asset={asset || undefined} explorers={chain?.explorers} />
        </div>
      </Checkbox>
    </li>
  );
});

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const selectedAmount = useUnit(validatorsModel.$selectedAmount);
  const canSubmit = useUnit(validatorsModel.$canSubmit);

  return (
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
  );
};
