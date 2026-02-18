import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, FootnoteText, Loader, SmallTitleText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { authModel } from '../model/auth-model';

export const AuthModal = () => {
  const [isOpen, step, error] = useUnit([authModel.$isAuthModalOpen, authModel.$authStep, authModel.$error]);

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={(open) => !open && authModel.events.modalClosed()}>
      {step === 'error' ? <ErrorStep error={error} /> : <SignInStep />}
    </Modal>
  );
};

const SignInStep = () => {
  const { t } = useI18n();

  const [step, selectedAccountId, extensionAccounts] = useUnit([
    authModel.$authStep,
    authModel.$selectedAccountId,
    authModel.$extensionAccounts,
  ]);

  const isSigning = step === 'signing';

  return (
    <>
      <Modal.Title close>{t('addressBook.auth.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={4}>
          {isSigning ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader color="primary" />
              <FootnoteText className="text-text-tertiary">{t('addressBook.auth.signingMessage')}</FootnoteText>
            </div>
          ) : extensionAccounts.length === 0 ? (
            <FootnoteText className="text-text-tertiary">{t('addressBook.auth.noExtensionAccounts')}</FootnoteText>
          ) : (
            <Field text={t('addressBook.auth.selectAccountLabel')}>
              <Select
                placeholder={t('addressBook.auth.selectAccountPlaceholder')}
                value={selectedAccountId}
                onChange={(value) => authModel.events.accountSelected(value as AccountId)}
              >
                {extensionAccounts.map((account) => (
                  <Select.Item key={account.accountId} value={account.accountId}>
                    <Box direction="row" gap={2} verticalAlign="center">
                      <Identicon address={toAddress(account.accountId)} size={20} />
                      <SmallTitleText>{account.name}</SmallTitleText>
                      <FootnoteText className="text-text-tertiary">
                        {toShortAddress(toAddress(account.accountId))}
                      </FootnoteText>
                    </Box>
                  </Select.Item>
                ))}
              </Select>
            </Field>
          )}
        </Box>
      </Modal.Content>
      {!isSigning && extensionAccounts.length > 0 && (
        <Modal.Footer>
          <Button className="ml-auto" disabled={!selectedAccountId} onClick={() => authModel.events.signConfirmed()}>
            {t('addressBook.auth.signButton')}
          </Button>
        </Modal.Footer>
      )}
    </>
  );
};

const ErrorStep = ({ error }: { error: string | null }) => {
  const { t } = useI18n();

  return (
    <>
      <Modal.Title close>{t('addressBook.auth.errorTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]}>
          <FootnoteText className="text-text-tertiary">{error}</FootnoteText>
        </Box>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="text" onClick={() => authModel.events.modalClosed()}>
          {t('addressBook.auth.closeButton')}
        </Button>
        <Button className="ml-auto" onClick={() => authModel.events.signInClicked()}>
          {t('addressBook.auth.tryAgainButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};
