import { FormEvent, useEffect } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { BaseModal, Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { ExtendedChain } from '@entities/network';
import { OperationTitle } from '@entities/chain';
import type { RpcNode } from '@shared/core';
import { createRpcNodeModel } from '../model/create-rpc-node-model';
import { FormState } from '../lib/types';

// const MODAL_ANIMATION = 300;

type Props = {
  isOpen: boolean;
  network: ExtendedChain;
  node?: RpcNode;
  onClose: (newNode?: RpcNode) => void;
};

export const CreateRpcNode = ({ network, node, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const {
    fields: { name, url },
    submit,
  } = useForm(createRpcNodeModel.$createRpcNodeForm);

  const formState = useUnit(createRpcNodeModel.$formState);
  const selectedNetwork = useUnit(createRpcNodeModel.$selectedNetwork);

  console.log('--> formstate', formState);
  // this remains null
  console.log('---> selectedNetwork', selectedNetwork);

  // const [formState, setFormState] = useState<FormState>(FormState.INIT);

  // const {
  //   control,
  //   handleSubmit,
  //   setFocus,
  //   setValue,
  //   watch,
  //   formState: { isValid, errors },
  // } = useForm<CustomRpcForm>({
  //   mode: 'onChange',
  //   defaultValues: { name: '', url: '' },
  // });

  // const urlAddress = watch('url');

  // const isNodeExist = (): boolean => {
  //   if (node?.url === urlAddress) return false;

  //   const predicate = (node: RpcNode): boolean => node.url === urlAddress;
  //   const defaultNodes = network.nodes;
  //   const customNodes = network.connection.customNodes || [];

  //   return defaultNodes.some(predicate) || customNodes.some(predicate);
  // };

  useEffect(() => {
    createRpcNodeModel.events.formInitiated();
  }, []);

  useEffect(() => {
    // this is called with the right network
    console.log('---> go', network);
    createRpcNodeModel.events.networkChanged(network);
  }, []);

  // useEffect(() => {
  //   if (!isOpen) return;

  //   setTimeout(() => setFocus('name'), MODAL_ANIMATION);
  // }, [isOpen, setFocus]);

  // useEffect(() => {
  //   if (!node?.name || !node.url) return;

  //   setValue('name', node.name);
  //   setValue('url', node.url);
  // }, [node]);

  // const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async (formData) => {
  //   if (formState === FormState.INIT) {
  //     await checkRpcNode(formData);
  //   }
  //   if (formState === FormState.VALID) {
  //     await saveRpcNode(formData);
  //     onClose(formData);
  //   }
  // };

  // const checkRpcNode = async (formData: CustomRpcForm): Promise<void> => {
  //   if (!network.chainId) return;

  //   try {
  //     setFormState(FormState.LOADING);
  //     const result = await networkService.validateRpcNode(network.chainId, formData.url);

  //     const options = {
  //       [RpcValidation.INVALID]: () => setFormState(FormState.INVALID),
  //       [RpcValidation.VALID]: () => setFormState(FormState.VALID),
  //       [RpcValidation.WRONG_NETWORK]: () => setFormState(FormState.WRONG_NETWORK),
  //     };
  //     options[result]();
  //   } catch (error) {
  //     console.warn(error);
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
  // const submitDisabled = !isValid || isNodeExist() || isLoading;
  const isLoading = false;
  const submitDisabled = !!isLoading;

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
            {/* <Controller
              name="name"
              control={control}
              rules={{ required: true, minLength: 3, maxLength: 50 }}
              render={({ field: { name, ref } }) => ( */}
            <Input
              // ref={ref}
              label={t('settings.networks.nameLabel')}
              placeholder={t('settings.networks.namePlaceholder')}
              invalid={name.hasError()}
              disabled={isLoading}
              value={name.value}
              onChange={name.onChange}
              //   />
              // )}
            />
            <InputHint variant="error" active={name?.hasError()}>
              {t(name?.errorText())}
            </InputHint>
          </div>
          <div className="flex flex-col gap-y-2">
            {/* <Controller
              name="url"
              control={control}
              rules={{ required: true, validate: validateWsAddress }}
              render={({ field: { onChange, value } }) => ( */}
            <Input
              label={t('settings.networks.addressLabel')}
              placeholder={t('settings.networks.addressPlaceholder')}
              value={url.value}
              invalid={url.hasError()}
              disabled={isLoading}
              onChange={url.onChange}
            />
            <InputHint variant="error" active={url?.hasError()}>
              {t(url?.errorText())}
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
          <Button type="submit" isLoading={isLoading} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
