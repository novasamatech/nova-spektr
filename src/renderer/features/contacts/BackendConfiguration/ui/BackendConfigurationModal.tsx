import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useConfirmContext } from '@/shared/providers/ConfirmContext';
import { Alert, Button, FootnoteText, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, Select, Surface, useNotification } from '@/shared/ui-kit';
import { authModel } from '../model/auth-model';
import { backendConfigurationModel } from '../model/backend-configuration-model';

export const BackendConfigurationModal = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { confirm } = useConfirmContext();

  const isOpen = useUnit(backendConfigurationModel.$isModalOpen);
  const draftUrl = useUnit(backendConfigurationModel.$draftUrl);
  const isValid = useUnit(backendConfigurationModel.$isUrlValid);
  const hasBackend = useUnit(backendConfigurationModel.$hasBackend);
  const isDirty = useUnit(backendConfigurationModel.$isDirty);

  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const authStep = useUnit(authModel.$authStep);
  const selectedAccountId = useUnit(authModel.$selectedAccountId);
  const extensionAccounts = useUnit(authModel.$extensionAccounts);
  const error = useUnit(authModel.$error);

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    return authModel.events.signInSucceeded.watch(() => {
      toast.success(t('addressBook.auth.connectionSuccess'));
    });
  }, [toast, t]);

  const isSigning = authStep === 'signing';
  const isError = authStep === 'error';
  const showUrlError = draftUrl.trim().length > 0 && !isValid;

  // When authenticated and URL hasn't changed, show connected state
  const urlUnchanged = isAuthenticated && !isDirty;

  // Show account selector when URL is valid and not in connected state
  const showAccountSelector = isValid && !urlUnchanged && !isSigning;
  const showSigningState = isSigning;
  const showConnectedAccount = urlUnchanged && authState;

  const canConnect = isValid && selectedAccountId !== null && !isSigning;

  const title = hasBackend
    ? t('addressBook.backendConfiguration.editTitle')
    : t('addressBook.backendConfiguration.addTitle');

  const handleClose = async () => {
    if (isDirty) {
      const confirmed = await confirm({
        title: t('addressBook.backendConfiguration.unsavedChangesTitle'),
        message: t('addressBook.backendConfiguration.unsavedChangesMessage'),
        confirmText: t('addressBook.backendConfiguration.discardButton'),
        cancelText: t('addressBook.backendConfiguration.keepEditingButton'),
        confirmPallet: 'error',
      });
      if (!confirmed) return;
    }
    backendConfigurationModel.events.modalClosed();
  };

  const handleConnect = () => {
    authModel.events.connectTriggered();
  };

  const handleDelete = () => {
    backendConfigurationModel.events.urlCleared();
    toast.success(t('addressBook.backendConfiguration.backendRemoved'));
  };

  const connectButtonText = isError
    ? t('addressBook.backendConfiguration.tryAgainButton')
    : t('addressBook.backendConfiguration.connectButton');

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={(open) => !open && handleClose()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={4}>
          <Field text={t('addressBook.backendConfiguration.urlLabel')}>
            <Input
              name="backendUrl"
              placeholder={t('addressBook.backendConfiguration.urlPlaceholder')}
              invalid={showUrlError}
              disabled={isSigning}
              value={draftUrl}
              onChange={backendConfigurationModel.events.urlChanged}
            />
            <InputHint variant="error" active={showUrlError}>
              {t('addressBook.backendConfiguration.urlInvalidError')}
            </InputHint>
          </Field>

          {showConnectedAccount && (
            <Field text={t('addressBook.auth.connectedAccountLabel')}>
              <Surface className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-x-2">
                  <Identicon address={toAddress(authState.accountId)} size={20} background={false} />
                  <FootnoteText>{authState.accountName}</FootnoteText>
                </div>
                <Button variant="text" size="sm" onClick={() => authModel.events.signOutClicked()}>
                  {t('addressBook.auth.disconnectButton')}
                </Button>
              </Surface>
            </Field>
          )}

          {showSigningState && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader color="primary" />
              <FootnoteText className="text-text-tertiary">{t('addressBook.auth.signingMessage')}</FootnoteText>
            </div>
          )}

          {showAccountSelector && (
            <AccountSelector
              extensionAccounts={extensionAccounts}
              selectedAccountId={selectedAccountId}
              onSelect={(id) => authModel.events.accountSelected(id)}
            />
          )}

          <Alert active={isError} title={t('addressBook.auth.errorTitle')} variant="error">
            {error && <Alert.Item withDot={false}>{error}</Alert.Item>}
          </Alert>
        </Box>
      </Modal.Content>
      <Modal.Footer>
        {hasBackend && (
          <Button variant="text" onClick={handleDelete}>
            {t('addressBook.actions.delete')}
          </Button>
        )}
        {!urlUnchanged && (
          <Button className="ml-auto" disabled={!canConnect} onClick={handleConnect}>
            {connectButtonText}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

const AccountSelector = ({
  extensionAccounts,
  selectedAccountId,
  onSelect,
}: {
  extensionAccounts: { accountId: AccountId; name: string; extension: string }[];
  selectedAccountId: AccountId | null;
  onSelect: (id: AccountId) => void;
}) => {
  const { t } = useI18n();

  if (extensionAccounts.length === 0) {
    return (
      <Field text={t('addressBook.auth.selectAccountLabel')}>
        <FootnoteText className="text-text-tertiary">{t('addressBook.auth.noExtensionAccounts')}</FootnoteText>
      </Field>
    );
  }

  return (
    <Field text={t('addressBook.auth.selectAccountLabel')}>
      <Select
        placeholder={t('addressBook.auth.selectAccountPlaceholder')}
        value={selectedAccountId}
        onChange={(value) => onSelect(value as AccountId)}
      >
        {extensionAccounts.map((account) => (
          <Select.Item key={account.accountId} value={account.accountId}>
            <Box direction="row" gap={2} verticalAlign="center">
              <Identicon address={toAddress(account.accountId)} size={20} />
              <SmallTitleText>{account.name}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">{toShortAddress(toAddress(account.accountId))}</FootnoteText>
            </Box>
          </Select.Item>
        ))}
      </Select>
    </Field>
  );
};
