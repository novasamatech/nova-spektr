import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useI18n } from '@/app/providers';
import { type MultisigTransactionDS } from '@/shared/api/storage';
import { type CallData } from '@/shared/core';
import { validateCallData } from '@/shared/lib/utils';
import { BaseModal, Button, InputArea, InputHint } from '@/shared/ui';

type CallDataForm = {
  callData: string;
};

type Props = {
  isOpen: boolean;
  tx?: MultisigTransactionDS;
  onClose: () => void;
  onSubmit: (callData: CallData) => void;
};

const CallDataModal = ({ isOpen, tx, onClose, onSubmit }: Props) => {
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
      <form id="multisigForm" className="mt-2 flex flex-col gap-y-4" onSubmit={handleSubmit(submitHandler)}>
        <Controller
          name="callData"
          control={control}
          rules={{ required: true, validate: validateCallDataValue }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <InputArea
                placeholder={t('operations.callData.inputPlaceholder')}
                value={value}
                invalid={!!error}
                onChange={onChange}
              />

              <InputHint className="mt-2" active={!!error} variant="error">
                {t('operations.callData.errorMessage')}
              </InputHint>
            </>
          )}
        />

        <div className="flex items-center justify-between">
          <InputHint active>{t('operations.callData.inputHint')}</InputHint>

          <Button disabled={!isValid} type="submit">
            {t('operations.callData.continueButton')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CallDataModal;
