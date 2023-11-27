import { useState } from 'react';
import { TFunction } from 'react-i18next';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';

import { useI18n, useMatrix } from '@app/providers';
import { Button, Input, InputHint, FootnoteText, InputFile, Tabs, Icon } from '@shared/ui';
import { TabItem } from '@shared/ui/Tabs/common/types';

type VerifyForm = {
  secretKey: string;
  secretFile: File;
};

const VerifyMethods = {
  SECRET_KEY: 0,
  PASS_PHRASE: 1,
  FILE: 2,
} as const;

type VerifyMethodsType = (typeof VerifyMethods)[keyof typeof VerifyMethods];

const getVerifyLabel = (t: TFunction, method: VerifyMethodsType): string => {
  const Labels = {
    [VerifyMethods.SECRET_KEY]: t('settings.matrix.verifyWithKey'),
    [VerifyMethods.PASS_PHRASE]: t('settings.matrix.verifyWithPassphrase'),
    [VerifyMethods.FILE]: t('settings.matrix.verifyWithFile'),
  };

  return Labels[method];
};

const getInputPlaceholders = (t: TFunction, method: VerifyMethodsType): string => {
  const Placeholders = {
    [VerifyMethods.SECRET_KEY]: t('settings.matrix.secretKeyPlaceholder'),
    [VerifyMethods.PASS_PHRASE]: t('settings.matrix.passphrasePlaceholder'),
    [VerifyMethods.FILE]: t('settings.matrix.secretFilePlaceholder'),
  };

  return Placeholders[method];
};

const getErrorMessage = (t: TFunction, method: VerifyMethodsType): string => {
  const Errors = {
    [VerifyMethods.SECRET_KEY]: t('settings.matrix.secretKeyError'),
    [VerifyMethods.PASS_PHRASE]: t('settings.matrix.passphraseError'),
    [VerifyMethods.FILE]: t('settings.matrix.fileError'),
  };

  return Errors[method];
};

export const Verification = () => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const [verifyFailed, setVerifyFailed] = useState(false);
  const [sessionIsVerified, setSessionIsVerified] = useState(matrix.sessionIsVerified);
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethodsType>(VerifyMethods.SECRET_KEY);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isValid },
  } = useForm<VerifyForm>({
    mode: 'onChange',
    defaultValues: { secretKey: '', secretFile: undefined },
  });

  const changeVerifyMethod = (method: VerifyMethodsType) => {
    reset();
    setVerifyFailed(false);
    setVerifyMethod(method);
  };

  const changeSecretFile = (onChange: (file: File) => void) => {
    return (file: File) => {
      setVerifyFailed(false);
      onChange(file);
    };
  };

  const submitVerification: SubmitHandler<VerifyForm> = async ({ secretKey, secretFile }) => {
    const methods = {
      [VerifyMethods.SECRET_KEY]: () => matrix.verifyWithKey(secretKey),
      [VerifyMethods.PASS_PHRASE]: () => matrix.verifyWithPhrase(secretKey),
      [VerifyMethods.FILE]: () => matrix.verifyWithFile(secretFile),
    };

    try {
      const verified = await methods[verifyMethod]();
      setSessionIsVerified(verified);
      setVerifyFailed(!verified);
    } catch (error) {
      setVerifyFailed(true);
      console.warn(error);
    }
  };

  const textInput = (
    <Controller
      name="secretKey"
      control={control}
      rules={{ required: true }}
      render={({ field: { value, onChange } }) => (
        <Input
          key={verifyMethod}
          wrapperClass="py-[11px]"
          placeholder={getInputPlaceholders(t, verifyMethod)}
          invalid={verifyFailed}
          value={value}
          onChange={onChange}
        />
      )}
    />
  );

  const fileInput = (
    <Controller
      name="secretFile"
      control={control}
      rules={{ required: true }}
      render={({ field: { onChange } }) => (
        <InputFile
          key={verifyMethod}
          className="h-[126px]"
          placeholder={getInputPlaceholders(t, verifyMethod)}
          accept="text/plain"
          invalid={verifyFailed}
          onChange={changeSecretFile(onChange)}
        />
      )}
    />
  );

  const tabItems: TabItem[] = [
    {
      id: VerifyMethods.SECRET_KEY,
      title: getVerifyLabel(t, VerifyMethods.SECRET_KEY),
      panel: textInput,
    },
    {
      id: VerifyMethods.PASS_PHRASE,
      title: getVerifyLabel(t, VerifyMethods.PASS_PHRASE),
      panel: textInput,
    },
    {
      id: VerifyMethods.FILE,
      title: getVerifyLabel(t, VerifyMethods.FILE),
      panel: fileInput,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <FootnoteText className="text-text-tertiary">{t('settings.matrix.verificationLabel')}</FootnoteText>
        <div className="flex items-center">
          <Icon name="logo" size={26} />
          <FootnoteText className="ml-[7px] mr-auto">{t('general.title.appName')}</FootnoteText>
          {sessionIsVerified ? (
            <FootnoteText className="text-text-positive">{t('settings.matrix.statusVerified')}</FootnoteText>
          ) : (
            <FootnoteText className="text-text-negative">{t('settings.matrix.statusNotVerified')}</FootnoteText>
          )}
        </div>
      </div>

      {!sessionIsVerified ? (
        <form className="flex flex-col gap-y-2" onSubmit={handleSubmit(submitVerification)}>
          <Tabs
            panelClassName=""
            items={tabItems}
            onChange={(index) => changeVerifyMethod(index as VerifyMethodsType)}
          />

          <InputHint variant="error" active={verifyFailed}>
            {getErrorMessage(t, verifyMethod)}
          </InputHint>

          <InputHint active className="mt-4">
            {t('settings.matrix.verificationHint')}
          </InputHint>

          <div className="flex justify-between items-center pt-3 mt-2">
            <Icon name="matrixFull" className="!w-[56px] text-[#00000066]" size={24} />
            <Button type="submit" disabled={!isValid}>
              {t('settings.matrix.verifyButton')}
            </Button>
          </div>
        </form>
      ) : (
        <Icon name="matrixFull" className="!w-[56px] text-[#00000066] mt-3" size={24} />
      )}
    </>
  );
};
