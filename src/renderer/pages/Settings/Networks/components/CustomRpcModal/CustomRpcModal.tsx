import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ExtendedChain } from '@entities/network';
import { OperationTitle } from '@entities/chain';
import type { RpcNode } from '@shared/core';
import { RpcCheckResult, curstomRpcCreationModel } from '@/src/renderer/features/network';

// const MODAL_ANIMATION = 300;

type Props = {
  isOpen: boolean;
  network: ExtendedChain;
  node?: RpcNode;
  onClose: () => void;
};

export const CustomRpcModal = ({ network, node, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const rpcCheckResult = useUnit(curstomRpcCreationModel.$rpcConnectivityResult);
  const isNodeExist = useUnit(curstomRpcCreationModel.$isNodeExist);

  useEffect(() => {
    curstomRpcCreationModel.events.formInitiated();
  }, []);

  useEffect(() => {
    curstomRpcCreationModel.events.networkChanged(network);
  }, []);

  const {
    fields: { name, url },
    submit,
  } = useForm(curstomRpcCreationModel.$customRpcCreationForm);

  // useEffect(() => {
  //   if (!isOpen) return;

  //   // setTimeout(() => setFocus('name'), MODAL_ANIMATION);
  // }, [isOpen]);

  // const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async (formData) => {
  //   if (formState === FormState.INIT) {
  //     await checkRpcNode(formData);
  //   }
  //   if (formState === FormState.VALID) {
  //     await saveRpcNode(formData);
  //     onClose(formData);
  //   }
  // };

  // const saveRpcNode = async (formData: CustomRpcForm): Promise<void> => {
  //   if (node) {
  //     manageNetworkModel.events.rpcNodeUpdated({
  //       chainId: network.chainId,
  //       oldNode: node,
  //       rpcNode: formData,
  //     });
  //   } else {
  //     manageNetworkModel.events.rpcNodeAdded({
  //       chainId: network.chainId,
  //       rpcNode: formData,
  //     });
  //   }
  // };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    submit();
  };

  const modalTitle = node ? t('settings.networks.titleEdit') : t('settings.networks.titleAdd');
  const submitLabel = node ? t('settings.networks.editNodeButton') : t('settings.networks.addNodeButton');
  const isLoading = rpcCheckResult === RpcCheckResult.LOADING;

  return (
    <BaseModal
      closeButton
      title={<OperationTitle title={modalTitle} chainId={network.chainId} />}
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
          <InputHint active={rpcCheckResult === RpcCheckResult.VALID && !isNodeExist} variant="success">
            {t('settings.networks.addressConnected')}
          </InputHint>
          <InputHint active={isNodeExist === true} variant="error">
            {t('settings.networks.nodeExist')}
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
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
