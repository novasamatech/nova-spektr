import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@app/providers';

import { useModalClose } from '@shared/lib/hooks';
import { Alert, BaseModal, Button, Input, InputHint } from '@shared/ui';

import { OperationTitle } from '@entities/chain';

import { customRpcUtils } from '../lib/custom-rpc-utils';
import { addCustomRpcModel } from '../model/add-custom-rpc-model';

export const AddCustomRpcModal = () => {
  const { t } = useI18n();

  const { submit } = useForm(addCustomRpcModel.$addCustomRpcForm);

  const chainId = useUnit(addCustomRpcModel.$chainId);
  const isFlowStarted = useUnit(addCustomRpcModel.$isFlowStarted);

  const [isModalOpen, closeModal] = useModalClose(isFlowStarted, addCustomRpcModel.events.flowClosed);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  if (!chainId) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      title={<OperationTitle title={t('settings.networks.titleAdd')} chainId={chainId} />}
      headerClass="py-3 pl-5 pr-3"
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <form id="add-rpc-form" onSubmit={onSubmit}>
        <div className="flex flex-col gap-y-4 mt-4">
          <NameInput />
          <UrlInput />
          <Alerts />
        </div>

        <ActionSection />
      </form>
    </BaseModal>
  );
};

const NameInput = () => {
  const { t } = useI18n();

  const {
    fields: { name },
  } = useForm(addCustomRpcModel.$addCustomRpcForm);

  const isLoading = useUnit(addCustomRpcModel.$isLoading);

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        label={t('settings.networks.nameLabel')}
        placeholder={t('settings.networks.namePlaceholder')}
        invalid={name.hasError()}
        disabled={isLoading}
        value={name.value}
        onChange={name.onChange}
      />
      <InputHint variant="error" active={name?.hasError()}>
        {t(name.errorText())}
      </InputHint>
    </div>
  );
};

const UrlInput = () => {
  const { t } = useI18n();

  const {
    fields: { url },
  } = useForm(addCustomRpcModel.$addCustomRpcForm);

  const isLoading = useUnit(addCustomRpcModel.$isLoading);

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        label={t('settings.networks.addressLabel')}
        placeholder={t('settings.networks.addressPlaceholder')}
        value={url.value}
        invalid={url.hasError()}
        disabled={isLoading}
        onChange={url.onChange}
      />
      <InputHint variant="error" active={url.hasError()}>
        {t(url.errorText())}
      </InputHint>
      <InputHint active variant="hint">
        {t('settings.networks.addressHint')}
      </InputHint>
    </div>
  );
};

const Alerts = () => {
  const { t } = useI18n();

  const chainName = useUnit(addCustomRpcModel.$chainName);
  const rpcValidation = useUnit(addCustomRpcModel.$rpcValidation);

  if (!chainName || !rpcValidation) {
    return null;
  }

  return (
    <>
      <Alert
        active={customRpcUtils.isRpcInvalid(rpcValidation)}
        title={t('settings.networks.addressNoConnect')}
        variant="error"
      />
      <Alert
        active={customRpcUtils.isRpcWrongNetwork(rpcValidation)}
        title={t('settings.networks.addressWrongNetwork', { networkName: chainName })}
        variant="error"
      />
    </>
  );
};

const ActionSection = () => {
  const { t } = useI18n();

  const isLoading = useUnit(addCustomRpcModel.$isLoading);
  const canSubmit = useUnit(addCustomRpcModel.$canSubmit);

  return (
    <div className="flex justify-end mt-7 w-full">
      <Button type="submit" form="add-rpc-form" isLoading={isLoading} disabled={!canSubmit}>
        {t('settings.networks.addNodeButton')}
      </Button>
    </div>
  );
};
