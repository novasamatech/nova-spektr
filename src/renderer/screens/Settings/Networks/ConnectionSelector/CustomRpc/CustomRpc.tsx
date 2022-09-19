import { ChangeEvent, useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, Icon, Input, InputHint } from '@renderer/components/ui';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { RpcNode } from '@renderer/domain/chain';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';

const MODAL_ANIMATION = 300;

type CustomRpcForm = {
  name: string;
  address: string;
};

type Props = {
  chainId: ChainId;
  genesisHash?: HexString;
  existingUrls: string[];
  isOpen: boolean;
  onClose: () => void;
};

const CustomRpc = ({ chainId, genesisHash, existingUrls, isOpen, onClose }: Props) => {
  const { validateRpcNode, addRpcNode } = useNetworkContext();

  const [formState, setFormState] = useState<'init' | 'loading' | 'done'>('init');
  const [newRpcNode, setNewRpcNode] = useState<RpcNode>();

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    resetField,
    watch,
    formState: { isValid, errors },
  } = useForm<CustomRpcForm>({
    mode: 'onChange',
    defaultValues: { name: '', address: '' },
  });

  const urlAddress = watch('address');

  const isExistingUrl = existingUrls.some((url) => url === urlAddress);

  useEffect(() => {
    if (!isOpen) return;

    setTimeout(() => setFocus('name'), MODAL_ANIMATION);
  }, [isOpen, setFocus]);

  const onPasteAddress = (handler: (value: string) => void) => async () => {
    try {
      const text = await navigator.clipboard.readText();
      handler(text.trim());
    } catch (error) {
      console.warn(error);
    }
  };

  const onCloseModal = () => {
    onClose();

    setTimeout(() => {
      reset();
      setNewRpcNode(undefined);
      setFormState('init');
    }, MODAL_ANIMATION);
  };

  const checkRpcNode = async (formData: CustomRpcForm) => {
    if (!genesisHash) return;

    setFormState('loading');
    const isValidNode = await validateRpcNode(genesisHash, formData.address);

    setFormState(isValidNode ? 'done' : 'init');
    setNewRpcNode({ name: formData.name, url: formData.address });
  };

  const saveRpcNode = async () => {
    if (!newRpcNode) return;

    try {
      await addRpcNode(chainId, newRpcNode);
    } catch (error) {
      console.warn(error);
    }
  };

  const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async (formData) => {
    if (formState === 'init') {
      await checkRpcNode(formData);
    } else if (formState === 'done') {
      await saveRpcNode();
      onCloseModal();
    }
  };

  const onAddressChange = (handler: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    handler(event.target.value);

    if (formState === 'done') {
      setFormState('init');
    }
  };

  const validateAddress = (address: string) =>
    /^wss:\/\/.+(\.[a-z]{2,}|:\d{1,5})(\/[a-z\d_-]+)*\W{0}\/?$/i.test(address);

  return (
    <BaseModal closeButton title="Add Custom Node" className="p-5 max-w-[500px]" isOpen={isOpen} onClose={onCloseModal}>
      <form className="flex flex-col gap-y-7.5 mt-9" onSubmit={handleSubmit(onSubmitCustomNode)}>
        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="name"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value, ref } }) => (
              <Input
                ref={ref}
                label="Name"
                placeholder="Type a name"
                invalid={Boolean(errors.name)}
                value={value}
                onChange={onChange}
              />
            )}
          />
          {errors.name ? (
            <InputHint type="error" className="px-2.5">
              Invalid name, maximum length is 256 symbols
            </InputHint>
          ) : (
            <InputHint type="hint" className="px-2.5">
              Example: My Custom node
            </InputHint>
          )}
        </div>

        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="address"
            control={control}
            rules={{ maxLength: 50, validate: validateAddress }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Node address"
                placeholder="Type or paste the node address"
                value={value}
                invalid={Boolean(errors.address)}
                onChange={onAddressChange(onChange)}
                suffixElement={
                  value ? (
                    <button className="text-neutral" type="button" onClick={() => resetField('address')}>
                      <Icon name="clearOutline" />
                    </button>
                  ) : (
                    <Button variant="outline" pallet="primary" onClick={onPasteAddress(onChange)}>
                      Paste
                    </Button>
                  )
                }
              />
            )}
          />
          {formState === 'init' && !errors.address && !isExistingUrl && (
            <InputHint type="hint" className="px-2.5">
              Example: wss://rpc.polkadot.io
            </InputHint>
          )}
          {formState === 'init' && !errors.address && isExistingUrl && (
            <InputHint type="error" className="px-2.5">
              Url address already exists
            </InputHint>
          )}
          {formState === 'init' && errors.address?.type === 'validate' && (
            <InputHint type="error" className="px-2.5">
              Invalid url, please type or paste it again
            </InputHint>
          )}
          {formState === 'init' && errors.address?.type === 'maxLength' && (
            <InputHint type="error" className="px-2.5">
              Invalid url, maximum length is 50 symbols
            </InputHint>
          )}
          {formState === 'loading' && (
            <InputHint type="alert" className="px-2.5">
              Please wait, establishing connection to node
            </InputHint>
          )}
          {formState === 'done' && (
            <InputHint type="success" className="px-2.5">
              Connection established
            </InputHint>
          )}
        </div>

        {formState === 'init' && (
          <Button
            className="w-max mx-auto"
            type="submit"
            weight="lg"
            variant="fill"
            pallet="primary"
            disabled={!isValid || isExistingUrl}
          >
            {!isValid || isExistingUrl ? 'Type or paste an address...' : 'Check connection'}
          </Button>
        )}
        {formState === 'loading' && (
          <div className="flex items-center justify-center border border-alert rounded-2lg text-alert w-40 h-10 mx-auto">
            <Icon className="animate-spin" name="loader" size={20} />
          </div>
        )}
        {formState === 'done' && (
          <Button
            className="w-max mx-auto"
            type="submit"
            weight="lg"
            variant="fill"
            pallet="primary"
            disabled={!isValid}
          >
            Save Custom Node
          </Button>
        )}
      </form>
    </BaseModal>
  );
};

export default CustomRpc;
