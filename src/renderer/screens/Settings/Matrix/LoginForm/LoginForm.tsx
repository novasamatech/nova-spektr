import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';
import { useState } from 'react';

import { useMatrix } from '@renderer/context/MatrixContext';
import { Block, Button, InfoLink, Input, Icon, Combobox, InputHint } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { WELL_KNOWN_SERVERS } from '@renderer/services/matrix';

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

  const submitState = !isLoggedIn && !inProgress;
  const register = <InfoLink url="https://app.element.io/#/register" showIcon={false} />;

  return (
    <Block>
      <h2 className="text-neutral text-xl font-semibold">{t('settings.matrix.formTitle')}</h2>
      <p className="text-neutral text-sm">{t('settings.matrix.formSubtitle')}</p>

      <form className="flex flex-col gap-y-5 mt-10" onSubmit={handleSubmit(submitMatrixLogin)}>
        <Controller
          name="homeserver"
          control={control}
          rules={{ required: true }}
          render={({ field: { onChange } }) => (
            <>
              <Combobox
                label={t('settings.matrix.homeserverLabel')}
                placeholder={t('settings.matrix.homeserverPlaceholder')}
                invalid={invalidHomeserver}
                disabled={!submitState || inProgress}
                options={HOME_SERVERS}
                onChange={changeHomeserver(onChange)}
              />
              <InputHint active={invalidHomeserver} variant="error">
                {t('settings.matrix.badServerError')}
              </InputHint>
            </>
          )}
        />

        {credentialsFlow ? (
          <>
            <Controller
              name="username"
              control={control}
              rules={{ required: true, validate: matrix.validateShortUserName }}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <>
                  <Input
                    className="w-full"
                    label={t('settings.matrix.usernameLabel')}
                    placeholder={t('settings.matrix.usernamePlaceholder')}
                    disabled={!submitState}
                    invalid={invalidLogin || Boolean(errors.username)}
                    value={value}
                    onChange={changeInputValue(onChange)}
                  />
                  <InputHint active={error?.type === 'validate'} variant="error">
                    {t('settings.matrix.usernameError')}
                  </InputHint>
                  <InputHint active={error?.type === 'required'} variant="error">
                    {t('settings.matrix.usernameRequiredError')}
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
                    className="w-full"
                    type="password"
                    label={t('settings.matrix.passwordLabel')}
                    placeholder={t('settings.matrix.passwordPlaceholder')}
                    disabled={!submitState}
                    invalid={invalidLogin || Boolean(errors.password)}
                    value={value}
                    onChange={changeInputValue(onChange)}
                  />
                  <InputHint active={invalidLogin} variant="error">
                    {t('settings.matrix.badCredentialsError')}
                  </InputHint>
                  <InputHint active={error?.type === 'required'} variant="error">
                    {t('settings.matrix.passwordRequiredError')}
                  </InputHint>
                </>
              )}
            />
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-x-1">
                <p className="flex gap-x-1 text-neutral-variant text-xs">
                  <Trans t={t} i18nKey="settings.matrix.registerLink" components={{ register }} />
                </p>
              </div>
              {submitState && (
                <Button
                  type="submit"
                  weight="lg"
                  variant="fill"
                  pallet="primary"
                  disabled={!isValid || invalidHomeserver}
                >
                  {t('settings.matrix.signInButton')}
                </Button>
              )}
              {inProgress && (
                <div className="flex items-center justify-center h-10 w-20 border border-shade-40 rounded-2lg">
                  <Icon className="text-shade-40 animate-spin" name="loader" size={20} />
                </div>
              )}
              {isLoggedIn && (
                <div className="flex items-center justify-center h-10 w-20 border border-success rounded-2lg">
                  <Icon className="text-success" name="checkmark" size={20} />
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-shade-40 text-sm py-4">
            <Trans t={t} i18nKey="settings.matrix.loginNotAvailable" values={{ homeserver }} />
          </p>
        )}
      </form>

      {/* TODO: in future show for SSO Login_Flows */}
      {/*<div className="flex flex-col items-center gap-y-4 mt-5 pt-2.5 border-t border-shade-10">*/}
      {/*  <p className="text-shade-20 font-bold text-2xs uppercase">{t('settings.matrix.loginSeparator')}</p>*/}
      {/*  <ul className="flex justify-center items-center gap-x-5">*/}
      {/*    {REGISTER_LINKS.map(({ icon, url }) => (*/}
      {/*      <li key={url}>*/}
      {/*        <a href={url} rel="noopener noreferrer" target="_blank">*/}
      {/*          <Icon name={icon} />*/}
      {/*        </a>*/}
      {/*      </li>*/}
      {/*    ))}*/}
      {/*  </ul>*/}
      {/*</div>*/}
    </Block>
  );
};

export default LoginForm;
