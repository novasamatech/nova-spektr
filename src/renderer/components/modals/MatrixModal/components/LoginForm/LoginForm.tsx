import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useState } from 'react';

import { useMatrix } from '@renderer/context/MatrixContext';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { WELL_KNOWN_SERVERS } from '@renderer/services/matrix';
import { Alert, Button, Combobox, FootnoteText, InfoLink, Input, InputHint } from '@renderer/components/ui-redesign';
import { Icon, Loader } from '@renderer/components/ui';

const HOME_SERVERS = WELL_KNOWN_SERVERS.map((server) => ({
  id: server.domain,
  value: server.domain,
  element: server.domain,
}));

// TODO: might come form loginFlows method
// const REGISTER_LINKS: { icon: IconNames; url: string }[] = [
//   { icon: 'apple', url: 'https://link_1.com' },
//   { icon: 'google', url: 'https://link_2.com' },
//   { icon: 'facebook', url: 'https://link_3.com' },
//   { icon: 'gitlab', url: 'https://link_4.com' },
//   { icon: 'github', url: 'https://link_5.com' },
// ];

type MatrixForm = {
  homeserver: string;
  username: string;
  password: string;
};

const LoginForm = () => {
  const { t } = useI18n();

  const { matrix } = useMatrix();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [credentialsFlow, setCredentialsFlow] = useState(true);
  const [invalidHomeserver, setInvalidHomeserver] = useState(false);
  const [invalidLogin, setInvalidLogin] = useState(false);

  const {
    handleSubmit,
    control,
    clearErrors,
    resetField,
    watch,
    formState: { isValid, errors },
  } = useForm<MatrixForm>({
    mode: 'onChange',
    defaultValues: { homeserver: '', username: '', password: '' },
  });

  const homeserver = watch('homeserver');

  const changeInputValue = (onChange: (value: string) => void) => {
    return (value: string) => {
      onChange(value);

      if (invalidLogin) {
        setInvalidLogin(false);
        clearErrors();
      }
    };
  };

  const changeHomeserver = (onChange: (server: string) => void) => {
    return async (option: DropdownResult<string>) => {
      onChange(option.value);

      setInProgress(true);
      try {
        await updateHomeserver(option.value);
        await checkLoginFlow();
      } catch (error) {
        console.warn(error);
      }
      setInProgress(false);
    };
  };

  const updateHomeserver = async (server: string) => {
    setInvalidHomeserver(false);
    try {
      await matrix.setHomeserver(server);
    } catch (error) {
      setInvalidHomeserver(true);
      throw error;
    }
  };

  const checkLoginFlow = async () => {
    const flows = await matrix.loginFlows();
    const loginIsAvailable = flows.includes('password');

    if (!loginIsAvailable) {
      resetField('username');
      resetField('password');
    }
    clearErrors();
    setInvalidLogin(false);
    setCredentialsFlow(loginIsAvailable);
  };

  const submitMatrixLogin: SubmitHandler<MatrixForm> = async ({ username, password }) => {
    if (inProgress) return;

    setInProgress(true);
    setInvalidLogin(false);
    try {
      await matrix.loginWithCreds(username, password);
      setIsLoggedIn(true);
    } catch (error) {
      console.warn(error);
      setInvalidLogin(true);
    }
    setInProgress(false);
  };

  const logInDisabled = isLoggedIn || inProgress || !isValid || invalidHomeserver || invalidLogin;
  const submitState = !isLoggedIn && !inProgress;
  const register = <InfoLink url="https://app.element.io/#/register" showIcon={false} />;

  return (
    <form className="flex flex-col gap-y-4" onSubmit={handleSubmit(submitMatrixLogin)}>
      <Controller
        name="homeserver"
        control={control}
        rules={{ required: true }}
        render={({ field: { onChange } }) => (
          <>
            <Combobox
              label={t('settings.matrix.homeserverLabel')}
              placeholder={t('settings.matrix.homeserverPlaceholder')}
              wrapperClass="py-[11px]"
              invalid={invalidHomeserver}
              disabled={!submitState || inProgress}
              options={HOME_SERVERS}
              onChange={changeHomeserver(onChange)}
            />
            <InputHint active={invalidHomeserver} variant="error" className="-mt-2">
              {t('settings.matrix.badServerError')}
            </InputHint>
          </>
        )}
      />

      {credentialsFlow ? (
        <>
          {!inProgress ? (
            <>
              <Controller
                name="username"
                control={control}
                rules={{ required: true, validate: matrix.validateShortUserName }}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <>
                    <Input
                      label={t('settings.matrix.usernameLabel')}
                      placeholder={t('settings.matrix.usernamePlaceholder')}
                      wrapperClass="py-[11px]"
                      disabled={!submitState}
                      invalid={invalidLogin || Boolean(errors.username)}
                      value={value}
                      onChange={changeInputValue(onChange)}
                    />
                    <InputHint active={error?.type === 'validate'} variant="error" className="-mt-2">
                      {t('settings.matrix.usernameError')}
                    </InputHint>
                  </>
                )}
              />

              <Controller
                name="password"
                control={control}
                rules={{ required: true }}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <>
                    <Input
                      type="password"
                      label={t('settings.matrix.passwordLabel')}
                      placeholder={t('settings.matrix.passwordPlaceholder')}
                      wrapperClass="py-[11px]"
                      disabled={!submitState}
                      invalid={invalidLogin || Boolean(errors.password)}
                      value={value}
                      onChange={changeInputValue(onChange)}
                    />
                    {invalidLogin && (
                      <Alert title={t('settings.matrix.badCredentialsError')} variant="error" className="-mt-2" />
                    )}
                  </>
                )}
              />
            </>
          ) : (
            <div className="w-full h-[136px] flex items-center justify-center">
              <Loader color="primary" />
            </div>
          )}

          <FootnoteText className="text-text-tertiary mt-2">{t('settings.matrix.privacyTitle')}</FootnoteText>

          <FootnoteText className="mt-2">
            <Trans t={t} i18nKey="settings.matrix.registerLink" components={{ register }} />
          </FootnoteText>
        </>
      ) : (
        <p className="text-center text-shade-40 text-sm py-4">
          <Trans t={t} i18nKey="settings.matrix.loginNotAvailable" values={{ homeserver }} />
        </p>
      )}

      <div className="flex justify-between items-center pt-3">
        <Icon name="matrixFull" className="!w-[56px] text-[#00000066]" size={24} />
        <Button type="submit" disabled={logInDisabled}>
          {t('settings.matrix.logInButton')}
        </Button>
      </div>
    </form>
  );
};

// TODO: in future show for SSO Login_Flows
// <div className="flex flex-col items-center gap-y-4 mt-5 pt-2.5 border-t border-shade-10">
//   <p className="text-shade-20 font-bold text-2xs uppercase">{t('settings.matrix.loginSeparator')}</p>
// <ul className="flex justify-center items-center gap-x-5">
//   {REGISTER_LINKS.map(({ icon, url }) => (
//     <li key={url}>
//       <a href={url} rel="noopener noreferrer" target="_blank">
//         <Icon name={icon} />
//       </a>
//     </li>
//   ))}
// </ul>
// </div>

export default LoginForm;
