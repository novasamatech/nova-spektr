import { useI18n } from '@app/providers';
import { Paths } from '@shared/routes';
import { Alert, ButtonLink, FootnoteText } from '@shared/ui';

type Props = {
  active: boolean;
};

export const DisconnectAlert = ({ active }: Props) => {
  const { t } = useI18n();

  return (
    <Alert title={t('fellowship.errors.disconnect.title')} active={active}>
      <FootnoteText className="text-text-secondary">{t('fellowship.errors.disconnect.description')}</FootnoteText>
      <ButtonLink variant="text" size="md" to={Paths.NETWORK}>
        {t('general.button.networkSettingsLink')}
      </ButtonLink>
    </Alert>
  );
};
