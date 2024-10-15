import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { Alert, Button } from '@/shared/ui';
import { navigationModel } from '@/features/navigation';

type Props = {
  active: boolean;
};

export const MultisigExistsAlert = ({ active }: Props) => {
  const { t } = useI18n();

  return (
    <Alert variant="error" title={t('operation.multisigExistsTitle')} active={active}>
      <Alert.Item withDot={false}>{t('operation.multisigExistsDescription')}</Alert.Item>
      <Alert.Item withDot={false}>
        <Button
          className="h-4.5 p-0"
          size="sm"
          variant="text"
          onClick={() => navigationModel.events.navigateTo(Paths.OPERATIONS)}
        >
          {t('operation.openOperationsButton')}
        </Button>
      </Alert.Item>
    </Alert>
  );
};
