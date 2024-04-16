import { FormEvent } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { OperationTitle } from '@entities/chain';
import { useModalClose } from '@shared/lib/hooks';
import { customRpcUtils } from '../lib/custom-rpc-utils';
import { editCustomRpcModel } from '../model/edit-custom-rpc-model';

export const EditCustomRpcModal = () => {
  const { submit } = useForm(editCustomRpcModel.$editCustomRpcForm);

  const isFlowStarted = useUnit(editCustomRpcModel.$isFlowStarted);
  const network = useUnit(editCustomRpcModel.$selectedNetwork);

  const [isModalOpen, closeModal] = useModalClose(isFlowStarted, editCustomRpcModel.events.flowFinished);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  if (!network) return null;

  return (
    <BaseModal
      closeButton
      title={<OperationTitle title={'settings.networks.titleEdit'} chainId={network.chainId} />}
      headerClass="py-3 pl-5 pr-3"
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <form id="edit-rpc-form" onSubmit={onSubmit}>
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
  } = useForm(editCustomRpcModel.$editCustomRpcForm);

  const isLoading = useUnit(editCustomRpcModel.$isLoading);

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
      <InputHint variant="error" active={name.hasError()}>
        {t(name.errorText())}
      </InputHint>
    </div>
  );
};

const UrlInput = () => {
  const { t } = useI18n();

  const {
    fields: { url },
  } = useForm(editCustomRpcModel.$editCustomRpcForm);

  const isLoading = useUnit(editCustomRpcModel.$isLoading);
  const rpcConnectivityResult = useUnit(editCustomRpcModel.$rpcConnectivityResult);

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <Input
          label={t('settings.networks.addressLabel')}
          placeholder={t('settings.networks.addressPlaceholder')}
          value={url.value}
          invalid={url.hasError()}
          disabled={isLoading}
          onChange={url.onChange}
        />
        <InputHint active variant="hint">
          {t('settings.networks.addressHint')}
        </InputHint>
        <InputHint variant="error" active={url.hasError()}>
          {t(url.errorText())}
        </InputHint>
      </div>

      <InputHint active={customRpcUtils.isRpcConnectivityValid(rpcConnectivityResult)} variant="success">
        {t('settings.networks.addressConnected')}
      </InputHint>
    </>
  );
};

const Alerts = () => {
  const { t } = useI18n();

  const network = useUnit(editCustomRpcModel.$selectedNetwork);
  const rpcConnectivityResult = useUnit(editCustomRpcModel.$rpcConnectivityResult);

  if (!network) return null;

  return (
    <>
      <Alert
        active={customRpcUtils.isRpcConnectivityInvalid(rpcConnectivityResult)}
        title={t('settings.networks.addressNoConnect')}
        variant="error"
      />
      <Alert
        active={customRpcUtils.isRpcConnectivityWrongNetwork(rpcConnectivityResult)}
        title={t('settings.networks.addressWrongNetwork', { networkName: network.name })}
        variant="error"
      />
    </>
  );
};

const ActionSection = () => {
  const { t } = useI18n();

  const { isValid } = useForm(editCustomRpcModel.$editCustomRpcForm);

  const isLoading = useUnit(editCustomRpcModel.$isLoading);

  return (
    <div className="flex justify-end mt-7 w-full">
      <Button type="submit" form="edit-rpc-form" isLoading={isLoading} disabled={isLoading || !isValid}>
        {t('settings.networks.editNodeButton')}
      </Button>
    </div>
  );
};
