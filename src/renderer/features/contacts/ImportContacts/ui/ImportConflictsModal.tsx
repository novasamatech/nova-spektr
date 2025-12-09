import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { importContactsModel } from '../model/import-contacts-model';

type Props = {
  onClose: () => void;
};

export const ImportConflictsModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const accountIdConflicts = useUnit(importContactsModel.$accountIdConflicts);

  const handleReplace = () => {
    importContactsModel.events.replaceConflicts();
  };

  const handleKeepCurrent = () => {
    importContactsModel.events.keepCurrent();
  };

  return (
    <Modal isOpen={true} size="md" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('addressBook.importContacts.conflicts.title')}</Modal.Title>
      <Modal.Content>
        <div className="mt-4 flex flex-col items-start gap-y-4 px-5">
          <SmallTitleText className="text-text-primary">
            {t('addressBook.importContacts.conflicts.description')}
          </SmallTitleText>

          <div className="max-h-96 w-full overflow-y-auto">
            {accountIdConflicts.map((conflict, index) => (
              <div key={index} className="py-2">
                <Address
                  address={toAddress(conflict.existing.address)}
                  showIcon
                  iconSize={20}
                  variant="truncate"
                  title={conflict.existing.name}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer align="end">
        <Button variant="fill" pallet="secondary" onClick={handleKeepCurrent}>
          {t('addressBook.importContacts.conflicts.keepCurrentButton')}
        </Button>
        <Button variant="fill" onClick={handleReplace}>
          {t('addressBook.importContacts.conflicts.replaceButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
