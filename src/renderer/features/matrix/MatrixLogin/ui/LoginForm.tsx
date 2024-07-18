import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';

import { useI18n } from '@app/providers';
import { type LoginFlows, WELL_KNOWN_SERVERS, validateShortUserName } from '@shared/api/matrix';
import {
  Alert,
  Button,
  ButtonWebLink,
  Combobox,
  FootnoteText,
  Icon,
  InfoLink,
  Input,
  InputHint,
  Loader,
  PasswordInput,
  Separator,
} from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
import { type ComboboxOption } from '@shared/ui/types';
import { LoginStatus, matrixModel, matrixUtils } from '@entities/matrix';
import { APP_CONFIG } from '../../../../../../app.config';
import { matrixLoginModel } from '../model/matrix-login-model';

const HOME_SERVERS = WELL_KNOWN_SERVERS.map((server) => ({
  id: server.domain,
  value: server.domain,
  element: server.domain,
}));

const DEFAULT_HOMESERVER = HOME_SERVERS[0];

type MatrixForm = {
  homeserver: ComboboxOption;
  username: string;
  password: string;
};

type Props = {
  redirectStep: string;
};

export const LoginForm = ({ redirectStep }: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const loginStatus = useUnit(matrixModel.$loginStatus);

  const homeserverQuery = useUnit(matrixLoginModel.$homeserverQuery);
  const homeServers = useUnit(matrixLoginModel.$homeServers);

  const [isHomeserverLoading, setIsHomeserverLoading] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [credentialsFlow, setCredentialsFlow] = useState(true);
  const [ssoFlows, setSsoFlows] = useState<LoginFlows['sso']>([]);
  const [invalidHomeserver, setInvalidHomeserver] = useState(false);
  const [invalidLogin, setInvalidLogin] = useState(false);

  const {
    handleSubmit,
    control,
    clearErrors,
    resetField,
    setValue,
    watch,
    formState: { isValid, errors },
  } = useForm<MatrixForm>({
    mode: 'onChange',
    defaultValues: { homeserver: DEFAULT_HOMESERVER, username: '', password: '' },
  });

  // @ts-expect-error TODO fix
  const homeserver = watch('homeserver');

  useEffect(() => {
    const handler = (value: ComboboxOption) => setValue('homeserver', value, { shouldValidate: true });

    changeHomeserver(handler)(DEFAULT_HOMESERVER);
  }, [setValue]);

  const changeInputValue = (onChange: (value: string) => void) => {
    return (value: string) => {
      onChange(value);

      if (invalidLogin) {
        setInvalidLogin(false);
        clearErrors();
      }
    };
  };

  const changeHomeserver = (onChange: (server: ComboboxOption) => void) => {
    return async (option: ComboboxOption<string>) => {
      onChange(option);

      setIsHomeserverLoading(true);
      try {
        await updateHomeserver(option.value);
        await checkLoginFlow();
      } catch (error) {
        console.warn(error);
      }
      setIsHomeserverLoading(false);
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
    const loginIsAvailable = flows.password;

    if (!flows.password) {
      resetField('username');
      resetField('password');
    }
    clearErrors();
    setInvalidLogin(false);
    setCredentialsFlow(loginIsAvailable);
    setSsoFlows(flows.sso);
  };

  const submitMatrixLogin: SubmitHandler<MatrixForm> = async ({ username, password }) => {
    if (isHomeserverLoading) return;

    setInProgress(true);
    setInvalidLogin(false);
    try {
      await matrix.loginWithCreds(username, password);
      matrixModel.events.loginStatusChanged(LoginStatus.LOGGED_IN);
    } catch (error) {
      console.warn(error);
      setInvalidLogin(true);
    }
    setInProgress(false);
  };

  const getSsoRedirectUrl = (redirectStep: string): string => {
    if (window.App) {
      //eslint-disable-next-line i18next/no-literal-string
      return `${APP_CONFIG.ELECTRON_PROTOCOL}://webapp/?step=${redirectStep}`;
    }

    //eslint-disable-next-line i18next/no-literal-string
    return `${window.location.origin}/?step=${redirectStep}`;
  };

  const logInDisabled = isHomeserverLoading || !isValid || invalidHomeserver || invalidLogin;
  const isEditing = !matrixUtils.isLoggedIn(loginStatus) && !isHomeserverLoading && !inProgress;
  const register = <InfoLink url="https://app.element.io/#/register" />;

  return (
    <>
      <form id="matrixLogin" className="flex flex-col gap-y-4" onSubmit={handleSubmit(submitMatrixLogin)}>
        <Controller
          name="homeserver"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <div className="flex flex-col gap-y-2">
              <Combobox
                label={t('settings.matrix.homeserverLabel')}
                placeholder={t('settings.matrix.homeserverPlaceholder')}
                wrapperClass="py-[11px]"
                query={homeserverQuery}
                invalid={invalidHomeserver}
                disabled={!isEditing || isHomeserverLoading}
                options={homeServers}
                value={value.value}
                onInput={matrixLoginModel.events.homeserverQueryChanged}
                onChange={changeHomeserver(onChange)}
              />
              <InputHint active={invalidHomeserver} variant="error">
                {t('settings.matrix.badServerError')}
              </InputHint>
            </div>
          )}
        />

        {!credentialsFlow && (
          <p className="text-center text-shade-40 text-sm py-4">
            <Trans t={t} i18nKey="settings.matrix.loginNotAvailable" values={{ homeserver }} />
          </p>
        )}

        {credentialsFlow && isHomeserverLoading && (
          <div className="w-full h-[136px] flex items-center justify-center">
            <Loader color="primary" />
          </div>
        )}

        {credentialsFlow && !isHomeserverLoading && (
          <>
            <Controller
              name="username"
              control={control}
              rules={{ required: true, validate: validateShortUserName }}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <>
                  <Input
                    label={t('settings.matrix.usernameLabel')}
                    placeholder={t('settings.matrix.usernamePlaceholder')}
                    wrapperClass="py-[11px]"
                    disabled={!isEditing}
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
              render={({ field: { value, onChange } }) => (
                <>
                  <PasswordInput
                    label={t('settings.matrix.passwordLabel')}
                    placeholder={t('settings.matrix.passwordPlaceholder')}
                    wrapperClass="py-[11px]"
                    disabled={!isEditing}
                    invalid={invalidLogin || Boolean(errors.password)}
                    value={value}
                    onChange={changeInputValue(onChange)}
                  />
                  <Alert
                    active={invalidLogin}
                    title={t('settings.matrix.badCredentialsError')}
                    variant="error"
                    className="-mt-2"
                  />
                </>
              )}
            />
          </>
        )}
      </form>

      <div className="flex flex-col gap-y-6 mt-6">
        {ssoFlows.length > 0 && (
          <div className="flex flex-col gap-y-6">
            <Separator text="or sign in" />

            <div className="flex justify-between gap-x-4">
              {ssoFlows.map(({ id, name, brand }) => (
                <ButtonWebLink
                  key={id}
                  href={matrix.getSsoLoginUrl(getSsoRedirectUrl(redirectStep), 'sso', id)}
                  target={window.App ? '_blank' : '_self'}
                  pallet="secondary"
                  className="flex-1"
                >
                  <div className="flex items-center gap-x-2">
                    <Icon className="text-text-primary" name={brand as IconNames} />
                    {name}
                  </div>
                </ButtonWebLink>
              ))}
            </div>
          </div>
        )}

        <FootnoteText className="text-text-tertiary">{t('settings.matrix.privacyTitle')}</FootnoteText>

        <FootnoteText>
          <Trans t={t} i18nKey="settings.matrix.registerLink" components={{ register }} />
        </FootnoteText>
      </div>

      <div className="flex justify-between items-center pt-3">
        <Icon name="matrixFull" className="!w-[56px] text-[#00000066]" size={24} />
        <Button form="matrixLogin" type="submit" isLoading={inProgress} disabled={logInDisabled || inProgress}>
          {t('settings.matrix.logInButton')}
        </Button>
      </div>
    </>
  );
};
