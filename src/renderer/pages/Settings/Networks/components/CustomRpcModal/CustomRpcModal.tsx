import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ExtendedChain } from '@entities/network';
import { validateWsAddress } from '@shared/lib/utils';
import { OperationTitle } from '@entities/chain';
import type { RpcNode } from '@shared/core';
import { networkService, RpcValidation } from '@shared/api/network';
import { manageNetworkModel } from '../../model/manage-network-model';

const MODAL_ANIMATION = 300;

type CustomRpcForm = {
  name: string;
  url: string;
};

const enum FormState {
  'INIT',
  'LOADING',
  'VALID',
  'INVALID',
  'WRONG_NETWORK',
}

type Props = {
  isOpen: boolean;
  network: ExtendedChain;
  node?: RpcNode;
  onClose: (newNode?: RpcNode) => void;
};

export const CustomRpcModal = ({ network, node, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const [formState, setFormState] = useState<FormState>(FormState.INIT);

  const {
    control,
    handleSubmit,
    setFocus,
    setValue,
    watch,
    formState: { isValid, errors },
  } = useForm<CustomRpcForm>({
    mode: 'onChange',
    defaultValues: { name: '', url: '' },
  });

  const urlAddress = watch('url');

  const isNodeExist = (): boolean => {
    if (node?.url === urlAddress) return false;

    const predicate = (node: RpcNode): boolean => node.url === urlAddress;
    const defaultNodes = network.nodes;
    const customNodes = network.connection.customNodes || [];

    return defaultNodes.some(predicate) || customNodes.some(predicate);
  };

  useEffect(() => {
    if (!isOpen) return;

    setTimeout(() => setFocus('name'), MODAL_ANIMATION);
  }, [isOpen, setFocus]);

  useEffect(() => {
    if (!node?.name || !node.url) return;

    setValue('name', node.name);
    setValue('url', node.url);
  }, [node]);

  // const onCloseModal = (newNode?: RpcNode) => {
  //   onClose(newNode);
  //
  //   setTimeout(() => {
  //     reset();
  //     setFormState(FormState.INIT);
  //   }, MODAL_ANIMATION);
  // };

  const onAddressChange = (onChange: (value: string) => void) => {
    return (value: string) => {
      onChange(value);

      if ([FormState.VALID, FormState.INVALID, FormState.WRONG_NETWORK].includes(formState)) {
        setFormState(FormState.INIT);
      }
    };
  };

  const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async (formData) => {
    if (formState === FormState.INIT) {
      await checkRpcNode(formData);
    }
    if (formState === FormState.VALID) {
      await saveRpcNode(formData);
      onClose(formData);
    }
  };

  const checkRpcNode = async (formData: CustomRpcForm): Promise<void> => {
    if (!network.chainId) return;

    try {
      setFormState(FormState.LOADING);
      const result = await networkService.validateRpcNode(network.chainId, formData.url);

      const options = {
        [RpcValidation.INVALID]: () => setFormState(FormState.INVALID),
        [RpcValidation.VALID]: () => setFormState(FormState.VALID),
        [RpcValidation.WRONG_NETWORK]: () => setFormState(FormState.WRONG_NETWORK),
      };
      options[result]();
    } catch (error) {
      console.warn(error);
    }
  };

  const saveRpcNode = async (formData: CustomRpcForm): Promise<void> => {
    if (node) {
      manageNetworkModel.events.rpcNodeUpdated({
        chainId: network.chainId,
        oldNode: node,
        rpcNode: formData,
      });
    } else {
      manageNetworkModel.events.rpcNodeAdded({
        chainId: network.chainId,
        rpcNode: formData,
      });
    }
  };

  const modalTitle = node ? t('settings.networks.titleEdit') : t('settings.networks.titleAdd');
  const submitLabel = node ? t('settings.networks.editNodeButton') : t('settings.networks.addNodeButton');
  const submitDisabled = !isValid || isNodeExist();
  const isLoading = formState === FormState.LOADING;

  return (
    <BaseModal
      closeButton
      title={<OperationTitle title={modalTitle} chainId={network.chainId} />}
      headerClass="py-3 pl-5 pr-3"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmitCustomNode)}>
        <div className="flex flex-col gap-y-4 mt-4">
          <div className="flex flex-col gap-y-2">
            <Controller
              name="name"
              control={control}
              rules={{ required: true, minLength: 3, maxLength: 50 }}
              render={({ field: { onChange, value, ref } }) => (
                <Input
                  ref={ref}
                  label={t('settings.networks.nameLabel')}
                  placeholder={t('settings.networks.namePlaceholder')}
                  invalid={Boolean(errors.name)}
                  disabled={isLoading}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
            <InputHint active={errors.name?.type === 'maxLength'} variant="error">
              {t('settings.networks.maxLengthNameError')}
            </InputHint>
            <InputHint active={errors.name?.type === 'required'} variant="error">
              {t('settings.networks.requiredNameError')}
            </InputHint>
          </div>

          <div className="flex flex-col gap-y-2">
            <Controller
              name="url"
              control={control}
              rules={{ required: true, validate: validateWsAddress }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t('settings.networks.addressLabel')}
                  placeholder={t('settings.networks.addressPlaceholder')}
                  value={value}
                  invalid={Boolean(errors.url) || [FormState.INVALID, FormState.WRONG_NETWORK].includes(formState)}
                  disabled={isLoading}
                  onChange={onAddressChange(onChange)}
                />
              )}
            />
            <InputHint active={formState !== FormState.VALID && !errors.url && !isNodeExist()} variant="hint">
              {t('settings.networks.addressHint')}
            </InputHint>
            <InputHint active={errors.url?.type === 'required'} variant="error">
              {t('settings.networks.addressEmpty')}
            </InputHint>
            <InputHint active={formState === FormState.INIT && !errors.url && isNodeExist()} variant="error">
              {t('settings.networks.nodeExist')}
            </InputHint>
            <InputHint active={formState === FormState.INIT && errors.url?.type === 'validate'} variant="error">
              {t('settings.networks.addressInvalidUrl')}
            </InputHint>
            <InputHint active={formState === FormState.VALID} variant="success">
              {t('settings.networks.addressConnected')}
            </InputHint>
          </div>

          <Alert
            active={formState === FormState.INVALID}
            title={t('settings.networks.addressNoConnect')}
            variant="error"
          />
          <Alert
            active={formState === FormState.WRONG_NETWORK}
            title={t('settings.networks.addressWrongNetwork', { networkName: network.name })}
            variant="error"
          />
        </div>

        <div className="flex justify-end mt-7 w-full">
          <Button type="submit" isLoading={isLoading} disabled={submitDisabled || isLoading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
