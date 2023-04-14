import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, InputArea, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { MultisigTransactionDS } from '@renderer/services/storage';
import { CallData } from '@renderer/domain/shared-kernel';
import { validateCallData } from '@renderer/shared/utils/substrate';

type CallDataForm = {
  callData: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (callData: CallData) => void;
  tx?: MultisigTransactionDS;
};

const CallDataModal = ({ isOpen, onClose, onSubmit, tx }: Props) => {
  const { t } = useI18n();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CallDataForm>({
    mode: 'onChange',
    defaultValues: {
      callData: '',
    },
  });

  const validateCallDataValue = (callData: string): boolean => {
    return validateCallData(callData, tx?.callHash || '0x0');
  };

  const closeHandler = () => {
    reset();
    onClose();
  };

  const submitHandler: SubmitHandler<CallDataForm> = async ({ callData }) => {
    onSubmit(callData as CallData);
    closeHandler();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('operations.callData.title')}
      closeButton
      contentClass="px-5 pb-4 w-[400px]"
      onClose={closeHandler}
    >
      <form id="multisigForm" className="flex flex-col my-3 gap-20" onSubmit={handleSubmit(submitHandler)}>
        <Controller
          name="callData"
          control={control}
          rules={{ required: true, validate: validateCallDataValue }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <InputArea
                wrapperClass="my-2"
                placeholder={t('operations.callData.inputPlaceholder')}
                value={value}
                invalid={!!error}
                onChange={onChange}
              />

              <InputHint className="mb-4" active={!!error} variant="error">
                {t('operations.callData.errorMessage')}
              </InputHint>
              <InputHint className="mb-4" active={!error} variant="hint">
                {t('operations.callData.inputHint')}
              </InputHint>
            </>
          )}
        />

        <Button className="w-full" pallet="primary" variant="fill" disabled={!isValid} type="submit">
          {t('operations.callData.continueButton')}
        </Button>
      </form>
    </BaseModal>
  );
};

export default CallDataModal;
