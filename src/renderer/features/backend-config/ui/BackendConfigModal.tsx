import { useUnit } from 'effector-react';
import { type FormEvent, type ReactNode } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Alert, Button, InputHint, StatusLabel } from '@/shared/ui';
import { Field, Input, Modal } from '@/shared/ui-kit';
import { ConnectionStatus } from '../lib/types';
import { backendConfigModel } from '../model/backend-config-model';

type Props = {
  children?: ReactNode;
};

export const BackendConfigModal = ({ children }: Props) => {
  const { t, formatDate } = useI18n();

  const connectionStatus = useUnit(backendConfigModel.$connectionStatus);
  const lastSyncTime = useUnit(backendConfigModel.$lastSyncTime);
  const isModalOpen = useUnit(backendConfigModel.$isModalOpen);
  const isTesting = useUnit(backendConfigModel.$isTestingConnection);
  const isValid = useUnit(backendConfigModel.form.$isValid);

  const { fields, validate } = useForm(backendConfigModel.form);

  const handleToggle = (open: boolean) => {
    if (open) {
      backendConfigModel.events.modalOpened();
    } else {
      backendConfigModel.events.modalClosed();
    }
  };

  const handleTestConnection = (e: FormEvent) => {
    e.preventDefault();
    validate();

    if (isValid && fields.url.value) {
      backendConfigModel.events.testConnectionClicked();
    }
  };

  const getStatusVariant = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'success';
      case ConnectionStatus.FAILED:
        return 'error';
      case ConnectionStatus.TESTING:
        return 'waiting';
      default:
        return 'warn';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return t('backendConfig.statusConnected');
      case ConnectionStatus.FAILED:
        return t('backendConfig.statusFailed');
      case ConnectionStatus.TESTING:
        return t('backendConfig.statusTesting');
      default:
        return t('backendConfig.statusNotTested');
    }
  };

  const getLastSyncSubtitle = () => {
    if (!lastSyncTime) return undefined;

    return t('backendConfig.lastSync', {
      time: formatDate(new Date(lastSyncTime), 'PPpp'),
    });
  };

  return (
    <Modal isOpen={isModalOpen} size="md" onToggle={handleToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>

      <Modal.Title close>{t('backendConfig.modalTitle')}</Modal.Title>

      <Modal.Content>
        <form className="flex flex-col gap-y-4 p-5" onSubmit={handleTestConnection}>
          <Field text={t('backendConfig.urlLabel')}>
            <Input
              disabled={isTesting}
              invalid={fields.url.hasError}
              placeholder={t('backendConfig.urlPlaceholder')}
              value={fields.url.value}
              onChange={fields.url.onChange}
            />
            <InputHint active={fields.url.hasError} variant="error">
              {t(fields.url.errorMessage)}
            </InputHint>
          </Field>

          <StatusLabel subtitle={getLastSyncSubtitle()} title={getStatusLabel()} variant={getStatusVariant()} />

          <Alert
            active={connectionStatus === ConnectionStatus.FAILED}
            title={t('backendConfig.connectionFailedAlert')}
            variant="error"
          />
        </form>
      </Modal.Content>

      <Modal.Footer>
        <Button
          disabled={isTesting}
          form="backend-config-form"
          isLoading={isTesting}
          type="submit"
          onClick={handleTestConnection}
        >
          {t('backendConfig.testConnection')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
