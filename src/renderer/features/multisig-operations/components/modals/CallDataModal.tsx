import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { type CallData } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { nonNullable, validateCallData } from '@/shared/lib/utils';
import { BaseModal, Button, InputHint } from '@/shared/ui';
import { TextArea } from '@/shared/ui-kit';
import { type MultisigOperation, multisigOperation } from '@/domains/network';
import { OperationResult } from '@/entities/transaction';

type CallDataForm = {
  callData: string;
};

type Props = {
  isOpen: boolean;
  operation?: MultisigOperation;
  onClose: () => void;
  onSubmit: (callData: CallData) => void;
};

export const CallDataModal = ({ isOpen, operation, onClose, onSubmit }: Props) => {
  const { t } = useI18n();
  const [isSubmitting, toggleSubmitting] = useToggle();
  const [showSuccess, toggleSuccess] = useToggle();

  // Use stores to handle success and failure states
  const lastUpdatedOperation = useUnit(multisigOperation.$callDataUpdated);
  const isUpdatePending = useUnit(multisigOperation.updateCallData.pending);

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

  useEffect(() => {
    if (lastUpdatedOperation?.id === operation?.id && isSubmitting) {
      toggleSubmitting();
      toggleSuccess();
    }
  }, [lastUpdatedOperation, operation?.id, isSubmitting]);

  useEffect(() => {
    if (!isUpdatePending && isSubmitting && !lastUpdatedOperation) {
      toggleSubmitting();
    }
  }, [isUpdatePending, isSubmitting, lastUpdatedOperation]);

  const validateCallDataValue = (callData: string): boolean => {
    return validateCallData(callData, operation?.callHash || '0x0');
  };

  const closeHandler = () => {
    reset();
    onClose();
  };

  const closeSuccessModal = () => {
    toggleSuccess();
    closeHandler();
  };

  const submitHandler: SubmitHandler<CallDataForm> = ({ callData }) => {
    toggleSubmitting();
    onSubmit(callData as CallData);
  };

  // Show loading state during submission
  if (isSubmitting) {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="loading"
        title={t('operations.callData.submitting')}
        autoCloseTimeout={0}
        onClose={closeHandler}
      />
    );
  }

  // Show success state with auto-close
  if (showSuccess) {
    return (
      <OperationResult
        isOpen={isOpen}
        variant="success"
        title={t('operations.callData.success')}
        autoCloseTimeout={2000}
        onClose={closeSuccessModal}
      />
    );
  }

  // Show form modal when not in submission states
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
              <TextArea
                placeholder={t('operations.callData.inputPlaceholder')}
                value={value}
                invalid={nonNullable(error)}
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
