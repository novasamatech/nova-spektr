import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Trans } from 'react-i18next';

import { useMatrix } from '@renderer/context/MatrixContext';
import { Block, Button, Dropdown, InfoLink, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const HOME_SERVERS = [
  { id: '0', value: 'matrix.org', element: 'matrix.org' },
  { id: '1', value: 'matrix.parity.io', element: 'matrix.parity.io' },
  { id: '2', value: 'matrix.web3.foundation', element: 'matrix.web3.foundation' },
];

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

  const {
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<MatrixForm>({
    mode: 'onChange',
    defaultValues: { homeserver: '', username: '', password: '' },
  });

  const submitMatrixLogin: SubmitHandler<MatrixForm> = async ({ username, password }) => {
    // TODO: handle homeserver in other function
    // matrix.setHomeserver(homeserver);
    try {
      await matrix.loginWithCreds(username, password);
    } catch (error) {
      console.warn(error);
    }
  };

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
          render={({ field: { value, onChange } }) => (
            <Dropdown
              label={t('settings.matrix.homeserverLabel')}
              placeholder={t('settings.matrix.homeserverPlaceholder')}
              options={HOME_SERVERS}
              onChange={onChange}
            />
          )}
        />
        <Controller
          name="username"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <Input
              className="w-full"
              label={t('settings.matrix.usernameLabel')}
              placeholder={t('settings.matrix.usernamePlaceholder')}
              // disabled={isProcessing}
              // invalid={isLoginFailed}
              value={value}
              onChange={onChange}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <Input
              className="w-full"
              type="password"
              label={t('settings.matrix.passwordLabel')}
              placeholder={t('settings.matrix.passwordPlaceholder')}
              // disabled={isProcessing}
              // invalid={isLoginFailed}
              value={value}
              onChange={onChange}
            />
          )}
        />
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-x-1">
            <p className="flex gap-x-1 text-neutral-variant text-xs">
              <Trans t={t} i18nKey="settings.matrix.registerLink" components={{ register }} />
            </p>
          </div>
          <Button type="submit" variant="fill" pallet="primary" weight="lg" disabled={!isValid}>
            {t('settings.matrix.signInButton')}
          </Button>
        </div>
      </form>

      {/* TODO: in future show only for matrix.org */}
      {/*<div className="flex flex-col items-center gap-y-4 mt-5 pt-2.5 border-t border-shade-10">*/}
      {/*  <p className="text-shade-20 font-bold text-2xs uppercase">{t('settings.matrix.loginSeparator')}</p>*/}
      {/*  <ul className="flex justify-center items-center gap-x-5">*/}
      {/*    {REGISTER_LINKS.map(({ icon, url }) => (*/}
      {/*      <li key={url}>*/}
      {/*        <a href={url} rel="noopener noreferrer" target="_blank">*/}
      {/*          <Icon name={icon} size={24} />*/}
      {/*        </a>*/}
      {/*      </li>*/}
      {/*    ))}*/}
      {/*  </ul>*/}
      {/*</div>*/}
    </Block>
  );
};

export default LoginForm;
