import cn from 'classnames';
import { ChangeEvent, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, Icon, Input, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { RpcNode } from '@renderer/domain/chain';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { RpcValidation } from '@renderer/services/network/common/types';
import { pasteAddressHandler } from '@renderer/shared/utils/address';
import { validateWsAddress } from '@renderer/shared/utils/strings';

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
  chainId: ChainId;
  network: {
    name: string;
    icon: string;
    genesisHash?: HexString;
  };
  node?: RpcNode;
  existingUrls: string[];
  isOpen: boolean;
  onClose: (newNode?: RpcNode) => void;
};

const CustomRpcModal = ({ chainId, network, node, existingUrls, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { validateRpcNode, addRpcNode, updateRpcNode } = useNetworkContext();
  const [formState, setFormState] = useState<FormState>(FormState.INIT);

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    setValue,
    resetField,
    watch,
    formState: { isValid, errors },
  } = useForm<CustomRpcForm>({
    mode: 'onChange',
    defaultValues: { name: '', url: '' },
  });

  const urlAddress = watch('url');

  const isExistingUrl = existingUrls.some((url) => url === urlAddress);

  useEffect(() => {
    if (!isOpen) return;

    setTimeout(() => setFocus('name'), MODAL_ANIMATION);
  }, [isOpen, setFocus]);

  useEffect(() => {
    if (!node?.name || !node.url) return;

    setFormState(FormState.VALID);
    setValue('name', node.name);
    setValue('url', node.url);
  }, [node]);

  const onCloseModal = (newNode?: RpcNode) => {
    onClose(newNode);

    setTimeout(() => {
      reset();
      setFormState(FormState.INIT);
    }, MODAL_ANIMATION);
  };

  const checkRpcNode = async (formData: CustomRpcForm) => {
    if (!network.genesisHash) return;

    try {
      setFormState(FormState.LOADING);
      const result = await validateRpcNode(network.genesisHash, formData.url);

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

  const saveRpcNode = async (formData: CustomRpcForm) => {
    try {
      if (node) {
        await updateRpcNode(chainId, node, formData);
      } else {
        await addRpcNode(chainId, formData);
      }
    } catch (error) {
      console.warn(error);
    }
  };

  const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async (formData) => {
    if (formState === FormState.INIT) {
      await checkRpcNode(formData);
    }
    if (formState === FormState.VALID) {
      await saveRpcNode(formData);
      onCloseModal(formData);
    }
  };

  const onAddressChange = (handler: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    handler(event.target.value);

    if ([FormState.VALID, FormState.INVALID, FormState.WRONG_NETWORK].includes(formState)) {
      setFormState(FormState.INIT);
    }
  };

  return (
    <BaseModal
      closeButton
      title={node ? t('networkManagement.customRpc.titleEdit') : t('networkManagement.customRpc.titleAdd')}
      description={
        <div className="flex gap-x-1 justify-center">
          <img src={network.icon} alt="" width={20} height={20} />
          <p className="uppercase font-bold text-sm">{network.name}</p>
        </div>
      }
      isOpen={isOpen}
      onClose={() => onCloseModal()}
    >
      <form className="flex flex-col gap-y-7.5 mt-9 w-[500px]" onSubmit={handleSubmit(onSubmitCustomNode)}>
        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="name"
            control={control}
            rules={{ required: true, minLength: 3, maxLength: 50 }}
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label={t('networkManagement.customRpc.nameLabel')}
                placeholder={t('networkManagement.customRpc.namePlaceholder')}
                invalid={Boolean(errors.name)}
                disabled={formState === FormState.LOADING}
                value={value}
                onChange={onChange}
              />
            )}
          />
          <InputHint active={!errors.name} variant="hint" className="px-2.5">
            {t('networkManagement.customRpc.nameHint')}
          </InputHint>
          <InputHint active={errors.name?.type === 'maxLength'} variant="error" className="px-2.5">
            {t('networkManagement.customRpc.maxLengthNameError')}
          </InputHint>
          <InputHint
            active={['minLength', 'required'].includes(errors.name?.type || '')}
            variant="error"
            className="px-2.5"
          >
            {t('networkManagement.customRpc.minLengthNameError')}
          </InputHint>
        </div>

        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="url"
            control={control}
            rules={{ required: true, validate: validateWsAddress }}
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('networkManagement.customRpc.addressLabel')}
                placeholder={t('networkManagement.customRpc.addressPlaceholder')}
                value={value}
                invalid={Boolean(errors.url) || [FormState.INVALID, FormState.WRONG_NETWORK].includes(formState)}
                disabled={formState === FormState.LOADING}
                suffixElement={
                  value ? (
                    <button
                      className={cn(formState === FormState.LOADING ? 'text-shade-40' : 'text-neutral')}
                      type="button"
                      disabled={formState === FormState.LOADING}
                      onClick={() => resetField('url')}
                    >
                      <Icon name="clearOutline" />
                    </button>
                  ) : (
                    <Button variant="outline" pallet="primary" onClick={pasteAddressHandler(onChange)}>
                      {t('networkManagement.customRpc.pasteButton')}
                    </Button>
                  )
                }
                onChange={onAddressChange(onChange)}
              />
            )}
          />
          <InputHint
            active={formState === FormState.INIT && !errors.url && !isExistingUrl}
            variant="hint"
            className="px-2.5"
          >
            {t('networkManagement.customRpc.addressHint')}
          </InputHint>
          <InputHint
            active={formState === FormState.INIT && !errors.url && isExistingUrl}
            variant="error"
            className="px-2.5"
          >
            {t('networkManagement.customRpc.addressUrlExist')}
          </InputHint>
          <InputHint active={errors.url?.type === 'required'} variant="error" className="px-2.5">
            {t('networkManagement.customRpc.addressEmpty')}
          </InputHint>
          <InputHint
            active={formState === FormState.INIT && errors.url?.type === 'validate'}
            variant="error"
            className="px-2.5"
          >
            {t('networkManagement.customRpc.addressInvalidUrl')}
          </InputHint>
          <InputHint active={formState === FormState.LOADING} variant="alert" className="px-2.5">
            {t('networkManagement.customRpc.addressPending')}
          </InputHint>
          <InputHint active={formState === FormState.VALID} variant="success" className="px-2.5">
            {t('networkManagement.customRpc.addressConnected')}
          </InputHint>
          <InputHint active={formState === FormState.WRONG_NETWORK} variant="error" className="px-2.5">
            {t('networkManagement.customRpc.addressWrongNetwork', { networkName: network.name })}
          </InputHint>
          <InputHint active={formState === FormState.INVALID} variant="error" className="px-2.5">
            {t('networkManagement.customRpc.addressNoConnect')}
          </InputHint>
        </div>

        {[FormState.INIT, FormState.INVALID, FormState.WRONG_NETWORK].includes(formState) && (
          <Button
            className="w-max mx-auto"
            type="submit"
            weight="lg"
            variant="fill"
            pallet="primary"
            disabled={formState === FormState.INVALID || !isValid || isExistingUrl}
          >
            {!isValid || isExistingUrl
              ? t('networkManagement.customRpc.typeAddressButton')
              : t('networkManagement.customRpc.checkConnectionButton')}
          </Button>
        )}
        {formState === FormState.LOADING && (
          <div className="flex items-center justify-center border border-alert rounded-2lg text-alert w-40 h-10 mx-auto">
            <Icon className="animate-spin" name="loader" size={20} />
          </div>
        )}
        {formState === FormState.VALID && (
          <Button
            className="w-max mx-auto"
            type="submit"
            weight="lg"
            variant="fill"
            pallet="primary"
            disabled={!isValid}
          >
            {t('networkManagement.customRpc.saveNodeButton')}
          </Button>
        )}
      </form>
    </BaseModal>
  );
};

export default CustomRpcModal;
