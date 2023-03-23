import { useState } from 'react';
import { TFunction } from 'react-i18next';
import cn from 'classnames';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';

import { useI18n } from '@renderer/context/I18nContext';
import { Button, Block, Input, Dropdown, Icon, InputHint } from '@renderer/components/ui';
import { useMatrix } from '@renderer/context/MatrixContext';
import { DropdownResult, DropdownOption } from '@renderer/components/ui/Dropdowns/common/types';
import { getOperatingSystem } from '@renderer/shared/utils/browser';
import InputFile from '@renderer/components/ui/Inputs/InputFile/InputFile';
import { pasteAddressHandler } from '@renderer/shared/utils/address';

type VerifyForm = {
  secretKey: string;
  secretFile: File;
};

const enum VerifyMethods {
  SECRET_KEY,
  PASS_PHRASE,
  FILE,
}

const getVerifyOptions = (t: TFunction): DropdownOption<VerifyMethods>[] => [
  { id: '0', value: VerifyMethods.SECRET_KEY, element: t('settings.matrix.verifyWithKey') },
  { id: '1', value: VerifyMethods.PASS_PHRASE, element: t('settings.matrix.usePassphrase') },
  { id: '2', value: VerifyMethods.FILE, element: t('settings.matrix.uploadFile') },
];

const getInputPlaceholders = (t: TFunction, method: VerifyMethods): string => {
  const placeholders = {
    [VerifyMethods.SECRET_KEY]: t('settings.matrix.secretKeyPlaceholder'),
    [VerifyMethods.PASS_PHRASE]: t('settings.matrix.passphrasePlaceholder'),
    [VerifyMethods.FILE]: t('settings.matrix.secretFilePlaceholder'),
  };

  return placeholders[method];
};

const getErrorMessage = (t: TFunction, method: VerifyMethods): string => {
  const errors = {
    [VerifyMethods.SECRET_KEY]: t('settings.matrix.secretKeyError'),
    [VerifyMethods.PASS_PHRASE]: t('settings.matrix.passphraseError'),
    [VerifyMethods.FILE]: t('settings.matrix.fileError'),
  };

  return errors[method];
};

const Verification = () => {
  const { t } = useI18n();
  const { matrix } = useMatrix();

  const verifyOptions = getVerifyOptions(t);
  const [verifyMethod, setVerifyMethod] = useState<DropdownResult<VerifyMethods>>(verifyOptions[0]);

  const [sessionIsVerified, setSessionIsVerified] = useState(matrix.userIsVerified);
  const [verifyFailed, setVerifyFailed] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isValid },
  } = useForm<VerifyForm>({
    mode: 'onChange',
    defaultValues: { secretKey: '', secretFile: undefined },
  });

  const changeVerifyMethod = (option: DropdownResult<VerifyMethods>) => {
    if (option.id === verifyMethod.id) return;

    reset();
    setVerifyFailed(false);
    setVerifyMethod(option);
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
      const verified = await methods[verifyMethod.value]();
      setSessionIsVerified(verified);
      setVerifyFailed(!verified);
    } catch (error) {
      setVerifyFailed(true);
      console.warn(error);
    }
  };

  return (
    <Block>
      <h2 className="text-neutral text-xl font-semibold">{t('settings.matrix.verificationTitle')}</h2>
      <p className="text-neutral text-sm">{t('settings.matrix.verificationSubtitle')}</p>

      <Block
        className={cn(
          'grid grid-flow-col grid-cols-[repeat(2,max-content),1fr] items-center gap-x-2.5',
          'mt-10 mb-2.5 p-2.5 shadow-surface',
        )}
      >
        <Icon className="row-span-2" name="logo" size={30} />
        <p className="text-neutral font-semibold text-base">{t('general.title.appName')}</p>
        <p className="text-neutral-variant font-semibold text-2xs">({getOperatingSystem()})</p>
        <div className="flex items-center gap-x-1 row-span-2 ml-auto">
          {sessionIsVerified ? (
            <>
              <Icon className="text-success" name="checkmarkCutout" size={12} />
              <p className="text-neutral-variant text-2xs font-semibold uppercase">
                {t('settings.matrix.statusVerified')}
              </p>
            </>
          ) : (
            <>
              <Icon className="text-alert" name="warnCutout" size={12} />
              <p className="text-neutral-variant text-2xs font-semibold uppercase">
                {t('settings.matrix.statusNotVerified')}
              </p>
            </>
          )}
        </div>
      </Block>

      {!sessionIsVerified && (
        <form className="flex flex-col gap-y-5" onSubmit={handleSubmit(submitVerification)}>
          <div className="flex flex-col gap-y-1 bg-shade-2 rounded-2lg">
            <Dropdown
              placeholder="dropdown"
              activeId={verifyMethod.id}
              options={verifyOptions}
              onChange={changeVerifyMethod}
            />
            {verifyMethod.value === VerifyMethods.FILE ? (
              <Controller
                name="secretFile"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange } }) => (
                  <InputFile
                    key={verifyMethod.id}
                    className="w-full"
                    placeholder={getInputPlaceholders(t, verifyMethod.value)}
                    accept="text/plain"
                    invalid={verifyFailed}
                    suffixElement={
                      <div
                        className={cn(
                          'flex items-center justify-center border border-primary cursor-pointer',
                          'text-xs leading-3.5 text-primary font-semibold h-6 px-2 rounded-md',
                        )}
                      >
                        {t('general.button.uploadButton')}
                      </div>
                    }
                    onChange={changeSecretFile(onChange)}
                  />
                )}
              />
            ) : (
              <Controller
                name="secretKey"
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    key={verifyMethod.id}
                    className="w-full"
                    placeholder={getInputPlaceholders(t, verifyMethod.value)}
                    invalid={verifyFailed}
                    value={value}
                    suffixElement={
                      <Button variant="outline" pallet="primary" weight="sm" onClick={pasteAddressHandler(onChange)}>
                        {t('general.button.pasteButton')}
                      </Button>
                    }
                    onChange={onChange}
                  />
                )}
              />
            )}
          </div>

          <InputHint variant="error" active={verifyFailed}>
            {getErrorMessage(t, verifyMethod.value)}
          </InputHint>

          <Button
            className="w-max ml-auto"
            type="submit"
            variant="fill"
            pallet="primary"
            weight="lg"
            disabled={!isValid}
          >
            {t('settings.matrix.verifyDeviceButton')}
          </Button>
        </form>
      )}
    </Block>
  );
};

export default Verification;
