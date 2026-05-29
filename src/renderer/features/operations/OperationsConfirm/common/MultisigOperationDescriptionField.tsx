import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Separator } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { multisigOperationDescription } from '@/aggregates/multisig-operation-description';
import { AddressBookHealthOverlay } from '@/features/contacts';

/**
 * Renders the multisig-operation description input on the per-flow Confirmation
 * step. Self-gating via the aggregate:
 *
 * - Field state — interactive description input (connected, multisig in address
 *   book, not a draft flow).
 * - Reconnect state — the input is disabled and covered by a reconnect overlay
 *   (address book offline but the user has connected before).
 * - Otherwise — renders nothing.
 *
 * The captured value is read at sign time by the aggregate, snapshotted, and
 * posted to the backend after the extrinsic is included.
 */
export const MultisigOperationDescriptionField = () => {
  const { t } = useI18n();
  const { showField, showReconnect, description } = useUnit({
    showField: multisigOperationDescription.$showField,
    showReconnect: multisigOperationDescription.$showReconnect,
    description: multisigOperationDescription.$description,
  });

  if (!showField && !showReconnect) return null;

  return (
    <>
      <Separator className="my-1 w-full" />
      <div className="w-full">
        {showReconnect ? (
          <AddressBookHealthOverlay isHealthy={false}>
            <Field text={t('operation.descriptionLabel')}>
              <TextArea
                value=""
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
