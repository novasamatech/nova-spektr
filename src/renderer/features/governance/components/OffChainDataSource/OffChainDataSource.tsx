import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button, FootnoteText, HelpText, Icon, InputHint } from '@/shared/ui';
import { Modal, Select } from '@/shared/ui-kit';
import { offChainModel } from '../../model/offChain';

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
    <Modal isOpen={isModalOpen} size="md" onToggle={closeModal}>
      <Modal.Title close>{t('governance.offChainDataSource.title')}</Modal.Title>
      <Modal.Content>
        <form id="offchain-datasource" className="flex flex-col gap-y-4 px-5" onSubmit={submitForm}>
          <div>
            <FootnoteText>{t('governance.offChainDataSource.formTitle')}</FootnoteText>
            <HelpText className="text-text-tertiary">{t('governance.offChainDataSource.formDescription')}</HelpText>
          </div>
          <DataSourceSelector />
        </form>
      </Modal.Content>
      <Modal.Footer>
        <ActionSection />
      </Modal.Footer>
    </Modal>
  );
};

const DataSourceSelector = () => {
  const { t } = useI18n();

  const {
    fields: { source },
  } = useForm(offChainModel.$offChainForm);

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        placeholder={t('governance.offChainDataSource.selectPlaceholder')}
        invalid={source.hasError()}
        value={source.value}
        onChange={source.onChange}
      >
        {/* eslint-disable i18next/no-literal-string */}
        <Select.Item value="polkassembly">
          <div className="flex items-center gap-x-1">
            <Icon size={16} name="polkassembly" />
            <FootnoteText>Polkassembly</FootnoteText>
          </div>
        </Select.Item>
        <Select.Item value="subsquare">
          <div className="flex items-center gap-x-1">
            <Icon size={16} name="subsquare" />
            <FootnoteText>Subsquare</FootnoteText>
          </div>
        </Select.Item>
        {/* eslint-enable i18next/no-literal-string */}
      </Select>
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
    <Button form="offchain-datasource" className="ml-auto w-fit" type="submit" disabled={!canSubmit}>
      {t('governance.offChainDataSource.save')}
    </Button>
  );
};
