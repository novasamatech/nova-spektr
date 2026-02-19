import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, InputHint } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, useNotification } from '@/shared/ui-kit';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

export const BackendConfigurationModal = () => {
  const { t } = useI18n();
  const { toast } = useNotification();

  const [isOpen, draftUrl, isValid, hasBackend, isAuthenticated, authState] = useUnit([
    backendConfigurationModel.$isModalOpen,
    backendConfigurationModel.$draftUrl,
    backendConfigurationModel.$isUrlValid,
    backendConfigurationModel.$hasBackend,
    authModel.$isAuthenticated,
    authModel.$authState,
  ]);

  const title = hasBackend
    ? t('addressBook.backendConfiguration.editTitle')
    : t('addressBook.backendConfiguration.addTitle');

  const showError = draftUrl.trim().length > 0 && !isValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) {
      backendConfigurationModel.events.urlSaved();
    }
  };

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={(open) => !open && backendConfigurationModel.events.modalClosed()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <form id="backend-configuration-form" onSubmit={handleSubmit}>
          <Box padding={[4, 5]} gap={4}>
            <Field text={t('addressBook.backendConfiguration.urlLabel')}>
              <Input
                name="backendUrl"
                placeholder={t('addressBook.backendConfiguration.urlPlaceholder')}
                invalid={showError}
                value={draftUrl}
                onChange={backendConfigurationModel.events.urlChanged}
              />
              <InputHint variant="error" active={showError}>
                {t('addressBook.backendConfiguration.urlInvalidError')}
              </InputHint>
            </Field>

            {isAuthenticated && authState ? (
              <Field text={t('addressBook.auth.connectedAccountLabel')}>
                <div className="flex items-center justify-between rounded-md border border-filter-border bg-input-background px-3 py-2">
                  <div className="flex items-center gap-x-2">
                    <Identicon address={toAddress(authState.accountId)} size={20} background={false} />
                    <FootnoteText>{authState.accountName}</FootnoteText>
                  </div>
                  <Button variant="text" size="sm" onClick={() => authModel.events.signOutClicked()}>
                    {t('addressBook.auth.disconnectButton')}
                  </Button>
                </div>
              </Field>
            ) : hasBackend ? (
              <Field text={t('addressBook.auth.connectedAccountLabel')}>
                <div className="flex items-center justify-between rounded-md border border-filter-border bg-input-background px-3 py-2">
                  <FootnoteText className="text-text-tertiary">{t('addressBook.auth.notConnected')}</FootnoteText>
                  <Button variant="text" size="sm" onClick={() => authModel.events.signInClicked()}>
                    {t('addressBook.auth.signInButton')}
                  </Button>
                </div>
              </Field>
            ) : null}
          </Box>
        </form>
      </Modal.Content>
      <Modal.Footer>
        {hasBackend && (
          <Button
            variant="text"
            onClick={() => {
              backendConfigurationModel.events.urlCleared();
              toast.success(t('addressBook.backendConfiguration.backendRemoved'));
            }}
          >
            {t('addressBook.actions.delete')}
          </Button>
        )}
        <Button className="ml-auto" type="submit" form="backend-configuration-form" disabled={!isValid}>
          {t('addressBook.backendConfiguration.saveButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
