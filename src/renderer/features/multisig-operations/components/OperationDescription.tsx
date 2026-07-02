import { Trans } from 'react-i18next';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { resolveDescriptionAreaState } from '@/shared/lib/operation-description/resolveDescriptionAreaState';
import { Button, DetailRow, FootnoteText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { ReconnectAddressBookButton } from '@/features/contacts';
import { NamedAccount } from '@/widgets/NameResolver';
import { useDescriptionEditing } from '../lib/use-description-editing';

import { DescriptionEditorModal } from './DescriptionEditorModal';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

const DESCRIPTION_PREVIEW_LENGTH = 40;

export const OperationDescription = ({ operation, chain }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const { canEdit, hasWritePermission, isInAddressBook, isHealthy, hasEverConnected } =
    useDescriptionEditing(operation);

  if (description) {
    const isLongDescription = description.length > DESCRIPTION_PREVIEW_LENGTH;
    const preview = isLongDescription
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
      : description;

    return (
      <DetailRow label={t('operation.descriptionLabel')}>
        <div className="flex min-w-0 items-center justify-end gap-x-3">
          <FootnoteText className="max-w-full truncate text-right text-text-secondary">{preview}</FootnoteText>
          {isLongDescription && (
            <Modal size="mdlg" height="fit">
              <Modal.Trigger>
                <Button size="sm" variant="text" className="shrink-0 p-0">
                  {t('operation.showDescriptionButton')}
                </Button>
              </Modal.Trigger>
              <Modal.Title close>{t('operation.descriptionLabel')}</Modal.Title>
              <Modal.Content>
                <div className="px-5 py-4">
                  <FootnoteText className="break-words whitespace-pre-wrap text-text-secondary">
                    {description}
                  </FootnoteText>
                </div>
              </Modal.Content>
            </Modal>
          )}
          {canEdit && (
            <DescriptionEditorModal
              operation={operation}
              trigger={
                <Button size="sm" variant="text" className="shrink-0 p-0">
                  {t('operation.editDescriptionButton')}
                </Button>
              }
            />
          )}
        </div>
      </DetailRow>
    );
  }

  const state = resolveDescriptionAreaState({
    isMultisig: true,
    isDraftActive: false,
    hasWritePermission,
    isHealthy,
    isInAddressBook,
    hasEverConnected,
  });

  if (state === 'hidden') return null;

  if (state === 'error') {
    return (
      <DetailRow label={t('operation.descriptionLabel')} wrapperClassName="items-start">
        <div className="flex w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-alert-border-negative bg-alert-background-negative p-3 text-footnote text-text-primary">
          <Trans
            t={t}
            i18nKey="operation.descriptionMultisigNotInBook"
            components={{
              account: (
                <NamedAccount accountId={operation.multisigAccountId} chain={chain} variant="short" hideExplorers />
              ),
            }}
          />
        </div>
      </DetailRow>
    );
  }

  if (state === 'reconnect') {
    return (
      <DetailRow label={t('operation.descriptionLabel')}>
        <ReconnectAddressBookButton
          size="sm"
          variant="text"
          iconSize={14}
          label={t('addressBook.auth.reconnectButton')}
          className="shrink-0 gap-x-1 p-0"
        />
      </DetailRow>
    );
  }

  return (
    <DetailRow label={t('operation.descriptionLabel')}>
      <DescriptionEditorModal
        operation={operation}
        trigger={
          <Button size="sm" variant="text" className="p-0">
            {t('operation.addDescriptionButton')}
          </Button>
        }
      />
    </DetailRow>
  );
};
