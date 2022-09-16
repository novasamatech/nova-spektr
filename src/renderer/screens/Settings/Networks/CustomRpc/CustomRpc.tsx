import { useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import InputHint from '@renderer/components/ui/InputError/InputHint';
import { BaseModal, Button, Icon, Input } from '@renderer/components/ui';

const CLOSE_DURATION = 300;

type CustomRpcForm = {
  name: string;
  address: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CustomRpc = ({ isOpen, onClose }: Props) => {
  const [formState] = useState<'init' | 'loading' | 'done'>('init');

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, errors },
  } = useForm<CustomRpcForm>({
    mode: 'onChange',
    defaultValues: { name: '', address: '' },
  });

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
    setTimeout(() => reset(), CLOSE_DURATION);
  };

  const onSubmitCustomNode: SubmitHandler<CustomRpcForm> = async ({ name, address }) => {
    console.log('submit');
  };

  return (
    <BaseModal closeButton title="Add Custom Node" className="p-5 max-w-[500px]" isOpen={isOpen} onClose={onCloseModal}>
      <form className="flex flex-col gap-y-7.5 mt-9" onSubmit={handleSubmit(onSubmitCustomNode)}>
        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="name"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Name"
                placeholder="Type a name"
                invalid={Boolean(errors.name)}
                value={value}
                onChange={onChange}
              />
            )}
          />
          <InputHint type="hint" className="px-2.5">
            Example: My Custom node
          </InputHint>
        </div>

        <div className="flex flex-col gap-y-2.5">
          <Controller
            name="address"
            control={control}
            rules={{ required: true, maxLength: 30 }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Node address"
                placeholder="Type or paste the node address"
                invalid={Boolean(errors.address)}
                value={value}
                onChange={onChange}
                suffixElement={
                  <Button variant="outline" pallet="primary" onClick={onPasteAddress(onChange)}>
                    Paste
                  </Button>
                }
              />
            )}
          />
          {!errors.address && formState === 'init' && (
            <InputHint type="hint" className="px-2.5">
              Example: wss://rpc.polkadot.io
            </InputHint>
          )}
          {formState === 'loading' && (
            <InputHint type="hint" className="px-2.5">
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
          <Button type="submit" weight="lg" variant="fill" pallet="primary" disabled={!isValid}>
            {isValid ? 'Check connection' : 'Type or paste an address...'}
            {/* Save Custom Node */}
          </Button>
        )}
        {formState === 'loading' && (
          <Button type="submit" weight="lg" variant="outline" pallet="alert" disabled={!isValid}>
            <Icon name="loader" size={20} />
          </Button>
        )}
        {formState === 'done' && (
          <Button type="submit" weight="lg" variant="fill" pallet="primary" disabled={!isValid}>
            Save Custom Node
          </Button>
        )}
      </form>
    </BaseModal>
  );
};

export default CustomRpc;
