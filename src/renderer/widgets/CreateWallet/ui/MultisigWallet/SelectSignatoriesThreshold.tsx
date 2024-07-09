import { useUnit } from 'effector-react';
import { useForm } from 'effector-forms';
import { FormEvent } from 'react';

import { Alert, Button, InputHint, Select, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { formModel } from '../../model/form-model';
import { flowModel } from '../../model/flow-model';
import { walletModel } from '@entities/wallet';
import { contactModel } from '@entities/contact';
import { SelectSignatories } from './components/SelectSignatories';
import { dictionary } from '@shared/lib/utils';
import { Step } from '../../lib/types';
import { DropdownOption } from '@shared/ui/types';
import { ExtendedContact } from './common/types';

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

interface Props {
  signatories: ExtendedContact[];
}

export const SelectSignatoriesThreshold = ({ signatories }: Props) => {
  const { t } = useI18n();

  const {
    fields: { chain, threshold },
    submit,
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hasOwnSignatory = useUnit(formModel.$hasOwnSignatory);
  const accounts = useUnit(formModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const contacts = useUnit(contactModel.$contacts);
  const thresholdOptions = getThresholdOptions(signatories.length - 1);

  const hasEnoughSignatories = signatories.length >= 2;
  const canSubmit = hasOwnSignatory && hasEnoughSignatories && !multisigAlreadyExists;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <section className="flex flex-col flex-1 h-full">
      <SmallTitleText className="px-5 text-text-secondary">
        {t('createMultisigAccount.step', { step: 2 })}
      </SmallTitleText>
      <SmallTitleText className="px-5 pb-6 mb-6 text-text-tertiary font-medium border-b border-container-border">
        {t('createMultisigAccount.signatoryThresholdDescription')}
      </SmallTitleText>
      <div className="flex flex-col gap-y-4 px-5 py-4">
        <SelectSignatories
          isActive
          accounts={accounts}
          wallets={dictionary(wallets, 'id')}
          contacts={contacts}
          chain={chain.value}
          onSelect={(accounts, contacts) => {
            formModel.events.accountSignatoriesChanged(accounts);
            formModel.events.contactSignatoriesChanged(contacts);
          }}
        />
        <div className="flex gap-x-4 items-end">
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
        <div className="flex gap-x-4 items-end">
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
        <div className="flex gap-x-4 items-end">
          <Alert
            active={Boolean(multisigAlreadyExists)}
            title={t('createMultisigAccount.multisigExistTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex justify-between items-center mt-auto">
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
