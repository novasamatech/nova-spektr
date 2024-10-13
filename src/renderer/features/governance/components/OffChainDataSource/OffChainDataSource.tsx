import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button, FootnoteText, HelpText, Icon, InputHint, Select } from '@/shared/ui';
import { offChainModel } from '../../model/offChain';

import { Sources } from './constants';

export const OffChainDataSource = () => {
  const { t } = useI18n();

  const isFlowStarted = useUnit(offChainModel.$isFlowStarted);
  const { submit } = useForm(offChainModel.$offChainForm);

  const [isModalOpen, closeModal] = useModalClose(isFlowStarted, offChainModel.output.flowClosed);

  useEffect(() => {
    offChainModel.events.flowStarted();
  }, []);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <BaseModal isOpen={isModalOpen} closeButton title={t('governance.offChainDataSource.title')} onClose={closeModal}>
      <form id="offchain-datasource" className="flex flex-col gap-y-4 pb-2 pt-4" onSubmit={submitForm}>
        <div>
          <FootnoteText>{t('governance.offChainDataSource.formTitle')}</FootnoteText>
          <HelpText className="text-text-tertiary">{t('governance.offChainDataSource.formDescription')}</HelpText>
        </div>
        <DataSourceSelector />
      </form>

      <ActionSection />
    </BaseModal>
  );
};

const DataSourceSelector = () => {
  const { t } = useI18n();

  const {
    fields: { source },
  } = useForm(offChainModel.$offChainForm);

  const options = Object.entries(Sources).map(([type, value]) => ({
    id: type,
    value: type,
    element: (
      <div className="flex items-center gap-x-1">
        <Icon size={16} name={value.icon} />
        <FootnoteText>{value.title}</FootnoteText>
      </div>
    ),
  }));

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        placeholder={t('governance.offChainDataSource.selectPlaceholder')}
        options={options}
        invalid={source.hasError()}
        selectedId={source.value}
        onChange={({ value }) => source.onChange(value)}
      />
      <InputHint active={source.hasError()} variant="error">
        {t(source.errorText())}
      </InputHint>
    </div>
  );
};

const ActionSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(offChainModel.$canSubmit);

  return (
    <Button form="offchain-datasource" className="ml-auto mt-7 w-fit" type="submit" disabled={!canSubmit}>
      {t('governance.offChainDataSource.save')}
    </Button>
  );
};
