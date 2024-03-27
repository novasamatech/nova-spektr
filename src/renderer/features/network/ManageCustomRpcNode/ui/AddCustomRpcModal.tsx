import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { OperationTitle } from '@entities/chain';
import { addCustomRpcModel } from '../model/add-custom-rpc-model';
import { customRpcUtils } from '../lib/custom-rpc-utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const AddCustomRpcModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const {
    fields: { name, url },
    submit,
    isValid,
    isDirty,
  } = useForm(addCustomRpcModel.$addCustomRpcForm);

  const network = useUnit(addCustomRpcModel.$selectedNetwork);
  const isNodeExist = useUnit(addCustomRpcModel.$isNodeExist);
  const rpcConnectivityResult = useUnit(addCustomRpcModel.$rpcConnectivityResult);
  const isLoading = useUnit(addCustomRpcModel.$isLoading);

  useEffect(() => {
    addCustomRpcModel.events.formInitiated();
  }, []);

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
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-y-4 mt-4">
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
            <InputHint variant="error" active={url?.hasError()}>
              {t(url.errorText())}
            </InputHint>
          </div>

          <InputHint
            active={customRpcUtils.isRpcConnectivityValid(rpcConnectivityResult) && !isNodeExist}
            variant="success"
          >
            {t('settings.networks.addressConnected')}
          </InputHint>
          <InputHint active={isNodeExist} variant="error">
            {t('settings.networks.nodeExist')}
          </InputHint>

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
        </div>

        <div className="flex justify-end mt-7 w-full">
          <Button type="submit" isLoading={isLoading} disabled={isLoading || !isValid || !isDirty}>
            {t('settings.networks.addNodeButton')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
