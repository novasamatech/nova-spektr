import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { OperationTitle } from '@entities/chain';
import { RpcCheckResult, editCustomRpcModel } from '@features/network';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const EditCustomRpcModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const rpcCheckResult = useUnit(editCustomRpcModel.$rpcConnectivityResult);
  const network = useUnit(editCustomRpcModel.$selectedNetwork);

  useEffect(() => {
    editCustomRpcModel.events.formInitiated();
  }, []);

  const {
    fields: { name, url },
    submit,
    isValid,
  } = useForm(editCustomRpcModel.$editCustomRpcForm);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    submit();
  };

  const isLoading = rpcCheckResult === RpcCheckResult.LOADING;

  if (!network) return null;

  return (
    <BaseModal
      closeButton
      title={<OperationTitle title={'settings.networks.titleAdd'} chainId={network.chainId} />}
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
              {t(name?.errorText())}
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
              {t(url?.errorText())}
            </InputHint>
          </div>
          <InputHint active={rpcCheckResult === RpcCheckResult.VALID} variant="success">
            {t('settings.networks.addressConnected')}
          </InputHint>
          <Alert
            active={rpcCheckResult === RpcCheckResult.INVALID}
            title={t('settings.networks.addressNoConnect')}
            variant="error"
          />
          <Alert
            active={rpcCheckResult === RpcCheckResult.WRONG_NETWORK}
            title={t('settings.networks.addressWrongNetwork', { networkName: network.name })}
            variant="error"
          />
        </div>

        <div className="flex justify-end mt-7 w-full">
          <Button type="submit" isLoading={isLoading} disabled={isLoading || !isValid}>
            {t('settings.networks.editNodeButton')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
