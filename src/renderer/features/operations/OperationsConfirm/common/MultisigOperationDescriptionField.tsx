import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { Separator } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { multisigOperationDescription } from '@/aggregates/multisig-operation-description';
import { AddressBookHealthOverlay } from '@/features/contacts';
import { NamedAccount } from '@/widgets/NameResolver';

/**
 * Renders the operation-description area on the Confirmation step. Which of
 * field / error / reconnect / hidden is shown is decided by the aggregate — see
 * resolveDescriptionAreaState. The captured value is read at sign time and
 * posted to the address book after the extrinsic is included.
 */
export const MultisigOperationDescriptionField = () => {
  const { t } = useI18n();
  const { showField, showReconnect, showError, description, multisigAccountId, chain } = useUnit({
    showField: multisigOperationDescription.$showField,
    showReconnect: multisigOperationDescription.$showReconnect,
    showError: multisigOperationDescription.$showError,
    description: multisigOperationDescription.$description,
    multisigAccountId: multisigOperationDescription.$multisigAccountId,
    chain: multisigOperationDescription.$chain,
  });

  if (!showField && !showReconnect && !showError) return null;

  return (
    <>
      <Separator className="my-1 w-full" />
      <div className="w-full">
        {showError ? (
          <Field text={t('operation.descriptionLabel')}>
            <div className="flex w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-alert-border-negative bg-alert-background-negative p-3 text-footnote text-text-primary">
              <Trans
                t={t}
                i18nKey="operation.descriptionMultisigNotInBook"
                components={{
                  account: multisigAccountId ? (
                    <NamedAccount
                      accountId={multisigAccountId}
                      chain={chain ?? undefined}
                      variant="short"
                      hideExplorers
                    />
                  ) : (
                    <span />
                  ),
                }}
              />
            </div>
          </Field>
        ) : showReconnect ? (
          <AddressBookHealthOverlay isHealthy={false}>
            <Field text={t('operation.descriptionLabel')}>
              <TextArea
                value={description}
                placeholder={t('operation.descriptionPlaceholder')}
                rows={2}
                maxLength={500}
                disabled
                onChange={() => {}}
              />
            </Field>
          </AddressBookHealthOverlay>
        ) : (
          <Field text={t('operation.descriptionLabel')}>
            <TextArea
              value={description}
              placeholder={t('operation.descriptionPlaceholder')}
              rows={2}
              maxLength={500}
              onChange={multisigOperationDescription.setDescription}
            />
          </Field>
        )}
      </div>
    </>
  );
};
