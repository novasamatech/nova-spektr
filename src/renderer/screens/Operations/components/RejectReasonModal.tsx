import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { BaseModal, Button, InputArea, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

type RejectReasonForm = {
  reason: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

const RejectReasonModal = ({ isOpen, onClose, onSubmit }: Props) => {
  const { t } = useI18n();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<RejectReasonForm>({
    mode: 'onChange',
    defaultValues: {
      reason: '',
    },
  });

  const closeHandler = () => {
    reset();
    onClose();
  };

  const submitHandler: SubmitHandler<RejectReasonForm> = async ({ reason }) => {
    onSubmit(reason);
    closeHandler();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={t('operation.rejectReason.title')}
      closeButton
      contentClass="px-5 pb-4 w-[400px]"
      onClose={closeHandler}
    >
      <form id="rejectReasonForm" className="flex flex-col my-3 gap-2" onSubmit={handleSubmit(submitHandler)}>
        <Controller
          name="reason"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <InputArea
                wrapperClass="my-2"
                placeholder={t('operation.rejectReason.placeholder')}
                value={value}
                invalid={!!error}
                onChange={onChange}
              />

              <InputHint className="mb-4" active={!!error} variant="error">
                {t('operation.rejectReason.errorMessage')}
              </InputHint>
              <InputHint className="mb-4" active={!error} variant="hint">
                {t('operations.rejectReason.inputHint')}
              </InputHint>
            </>
          )}
        />

        <Button className="w-full" pallet="primary" variant="fill" disabled={!isValid} type="submit">
          {t('operations.rejectReason.continueButton')}
        </Button>
      </form>
    </BaseModal>
  );
};

export default RejectReasonModal;
