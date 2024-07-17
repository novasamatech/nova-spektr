import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useI18n } from '@app/providers';

import { BaseModal, Button, InputArea, InputHint } from '@shared/ui';

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
      panelClass="w-[370px]"
      onClose={closeHandler}
    >
      <form id="rejectReasonForm" className="flex flex-col mt-2 gap-y-4" onSubmit={handleSubmit(submitHandler)}>
        <Controller
          name="reason"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <>
              <InputArea
                placeholder={t('operation.rejectReason.placeholder')}
                value={value}
                invalid={!!error}
                onChange={onChange}
              />

              <InputHint className="mt-2" active={!!error} variant="error">
                {t('operation.rejectReason.errorMessage')}
              </InputHint>
            </>
          )}
        />

        <div className="flex items-center justify-between">
          <InputHint active>{t('operation.rejectReason.inputHint')}</InputHint>

          <Button disabled={!isValid} type="submit">
            {t('operation.rejectReason.continueButton')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default RejectReasonModal;
