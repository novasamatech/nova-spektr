import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Alert, Button, Input, InputHint, Select, SmallTitleText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { Signatory } from '@renderer/domain/signatory';
import { Account, getMultisigAccountId, isMultisig, MultisigAccount } from '@renderer/domain/account';
import { SigningType } from '@renderer/domain/shared-kernel';

export type MultisigAccountForm = {
  name: string;
  threshold: DropdownResult<number> | undefined;
};

const getThresholdOptions = (optionsAmount: number): DropdownOption<number>[] => {
  if (optionsAmount === 0) return [];

  return Array.from({ length: optionsAmount }, (_, index) => ({
    id: index.toString(),
    element: index + 2,
    value: index + 2,
  }));
};

type Props = {
  signatories: Signatory[];
  accounts: (Account | MultisigAccount)[];
  isEditing: boolean;
  isLoading: boolean;
  onContinue: () => void;
  onCreateAccount: SubmitHandler<MultisigAccountForm>;
  onGoBack: () => void;
};

export const WalletForm = ({
  signatories,
  accounts,
  onCreateAccount,
  onContinue,
  isEditing,
  isLoading,
  onGoBack,
}: Props) => {
  const { t } = useI18n();

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<MultisigAccountForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      threshold: undefined,
    },
  });

  const threshold = watch('threshold');
  const thresholdOptions = getThresholdOptions(signatories.length - 1);

  const multisigAccountId =
    threshold &&
    getMultisigAccountId(
      signatories.map((s) => s.accountId),
      threshold.value,
    );

  const hasOwnSignatory = signatories.some((s) =>
    accounts.find((a) => a.accountId === s.accountId && a.signingType !== SigningType.WATCH_ONLY && !isMultisig(a)),
  );
  const accountAlreadyExists = accounts.find((a) => a.accountId === multisigAccountId);
  const hasTwoSignatories = signatories.length > 1;

  const signatoriesAreValid = hasOwnSignatory && hasTwoSignatories && !accountAlreadyExists;

  const canContinue = isValid && signatoriesAreValid;

  return (
    <section className="flex flex-col gap-y-4 px-5 py-4 flex-1 h-full">
      <SmallTitleText className="py-2">{t('createMultisigAccount.walletFormTitle')}</SmallTitleText>

      <form id="multisigForm" className="flex flex-col gap-y-4 h-full" onSubmit={handleSubmit(onCreateAccount)}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              placeholder={t('createMultisigAccount.namePlaceholder')}
              label={t('createMultisigAccount.walletNameLabel')}
              invalid={!!error}
              value={value}
              disabled={!isEditing}
              onChange={onChange}
            />
          )}
        />

        <div className="flex gap-x-4 items-end">
          <Controller
            name="threshold"
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <Select
                placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                label={t('createMultisigAccount.thresholdName')}
                className="w-[208px]"
                selectedId={value?.id.toString()}
                disabled={signatories.length < 2 || !isEditing}
                options={thresholdOptions}
                onChange={onChange}
              />
            )}
          />
          <InputHint className="flex-1" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>

        {Boolean(signatories.length) && !hasOwnSignatory && (
          <Alert title={t('createMultisigAccount.alertTitle')} variant="warn">
            <Alert.Item withDot={false}>{t('createMultisigAccount.alertText')}</Alert.Item>
          </Alert>
        )}

        {accounts.length === 0 && (
          <Alert title={t('createMultisigAccount.alertTitle')} variant="warn">
            <Alert.Item withDot={false}>{t('createMultisigAccount.accountsAlertText')}</Alert.Item>
          </Alert>
        )}

        <div className="flex justify-between items-center mt-auto">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>
          {isEditing ? (
            // without key continue button triggers form submit
            <Button key="continue" disabled={!canContinue} onClick={onContinue}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          ) : (
            <Button key="create" disabled={!canContinue || isLoading} type="submit">
              {t('createMultisigAccount.create')}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
};
