import { useI18n } from '@/shared/i18n';
import { Modal } from '@/shared/ui-kit';
import { useElectedValidators } from '@/aggregates/staking-validators';

import { SelectionFooter } from './SelectionFooter';
import { SelectionHeader } from './SelectionHeader';
import { SelectionToolbar } from './SelectionToolbar';
import { ValidatorDetailPane } from './ValidatorDetailPane';
import { ValidatorTable } from './ValidatorTable';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGoBack?: () => void;
};

/**
 * Reads everything it shows from `validatorSelectionModel`; the host flow only
 * says whether the screen is open and what closing it means.
 */
export const ValidatorSelectionModal = ({ isOpen, onClose, onGoBack }: Props) => {
  const { t } = useI18n();

  // Nothing else asks for the elected set, and a host may keep this component
  // mounted with `isOpen` false, so the request is tied to the screen actually
  // being open rather than to the mount.
  useElectedValidators(isOpen);

  return (
    <Modal
      isOpen={isOpen}
      size="3xl"
      height="full"
      onToggle={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Title close>{t('staking.validatorSelection.title')}</Modal.Title>

      <Modal.HeaderContent>
        <SelectionHeader />
        <SelectionToolbar />
      </Modal.HeaderContent>

      <Modal.Content disableScroll>
        <div className="flex h-full min-h-0 w-full border-t border-divider">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ValidatorTable />
          </div>
          <ValidatorDetailPane />
        </div>
      </Modal.Content>

      <SelectionFooter onGoBack={onGoBack} />
    </Modal>
  );
};
