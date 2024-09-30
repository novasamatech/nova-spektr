import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@app/providers';
import { Alert, Button, InputHint, Select, SmallTitleText } from '@shared/ui';
import { type DropdownOption } from '@shared/ui/types';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { SelectSignatories } from './components/SelectSignatories';

const getThresholdOptions = (optionsAmount: number): DropdownOption<number>[] => {
  if (optionsAmount === 0) return [];

  return Array.from({ length: optionsAmount }, (_, index) => {
    const value = index + 2;

    return {
      id: value.toString(),
      element: value,
      value,
    };
  });
};

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const {
    fields: { threshold },
    submit,
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hasOwnSignatory = useUnit(signatoryModel.$hasOwnSignatory);

  const thresholdOptions = getThresholdOptions(signatories.length - 1);

  const hasEnoughSignatories = signatories.length >= 2;
  const canSubmit = hasOwnSignatory && hasEnoughSignatories && !multisigAlreadyExists;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <section className="flex h-full flex-1 flex-col">
      <SmallTitleText className="px-5 text-text-secondary">
        {t('createMultisigAccount.multisigStep', { step: 2 })}
      </SmallTitleText>
      <SmallTitleText className="mb-6 border-b border-container-border px-5 pb-6 font-medium text-text-tertiary">
        {t('createMultisigAccount.signatoryThresholdDescription')}
      </SmallTitleText>
      <div className="flex flex-col gap-y-4 px-5 py-4">
        <SelectSignatories />
        <div className="flex items-end gap-x-4">
          <Alert
            active={!hasOwnSignatory && signatories.length > 0}
            title={t('createMultisigAccount.noOwnSignatoryTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.noOwnSignatory')}</Alert.Item>
          </Alert>
          <Alert
            active={hasOwnSignatory && !hasEnoughSignatories}
            title={t('createMultisigAccount.notEnoughSignatoriesTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEnoughSignatories')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex items-end gap-x-4">
          <Select
            placeholder={t('createMultisigAccount.thresholdPlaceholder')}
            label={t('createMultisigAccount.thresholdName')}
            className="w-[368px]"
            selectedId={threshold.value.toString()}
            options={thresholdOptions}
            invalid={threshold.hasError()}
            onChange={({ value }) => threshold.onChange(value)}
          />
          <InputHint className="flex-1" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>
        <div className="flex items-end gap-x-4">
          <Alert
            active={Boolean(multisigAlreadyExists)}
            title={t('createMultisigAccount.multisigExistTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
          </Alert>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.NAME_NETWORK)}>
            {t('createMultisigAccount.backButton')}
          </Button>
          <Button key="create" type="submit" disabled={!canSubmit} onClick={onSubmit}>
            {t('createMultisigAccount.continueButton')}
          </Button>
        </div>
      </div>
    </section>
  );
};
