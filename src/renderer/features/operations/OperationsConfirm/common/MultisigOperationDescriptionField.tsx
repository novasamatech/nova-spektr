import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Separator } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { multisigOperationDescription } from '@/aggregates/multisig-operation-description';

/**
 * Renders the multisig-operation description input on the per-flow Confirmation
 * step, only when the active wallet is a multisig variant and the user is
 * authenticated to the address-book backend. Hidden during draft submissions
 * (drafts carry their own description).
 *
 * The captured value is read at sign time by the aggregate, snapshotted, and
 * posted to the backend after the extrinsic is included.
 */
export const MultisigOperationDescriptionField = () => {
  const { t } = useI18n();
  const showInput = useUnit(multisigOperationDescription.$showInput);
  const description = useUnit(multisigOperationDescription.$description);

  if (!showInput) return null;

  return (
    <>
      <Separator className="my-1 w-full" />
      <div className="w-full">
        <Field text={t('operation.descriptionLabel')}>
          <TextArea
            value={description}
            placeholder={t('operation.descriptionPlaceholder')}
            rows={2}
            maxLength={500}
            onChange={multisigOperationDescription.setDescription}
          />
        </Field>
      </div>
    </>
  );
};
