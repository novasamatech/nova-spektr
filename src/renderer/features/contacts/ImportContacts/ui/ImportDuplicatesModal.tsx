import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { importContactsModel } from '../model/import-contacts-model';

type Props = {
  onClose: () => void;
};

export const ImportDuplicatesModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const importState = useUnit(importContactsModel.$importState);
  const duplicates = importState.status === 'duplicates' ? importState.duplicates : [];

  return (
    <Modal isOpen={true} size="md" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('addressBook.importContacts.duplicates.title')}</Modal.Title>
      <Modal.Content>
        <div className="mt-4 flex flex-col items-start gap-y-4 px-5">
          <SmallTitleText className="text-text-primary">
            {t('addressBook.importContacts.duplicates.description')}
          </SmallTitleText>

          <div className="max-h-96 w-full overflow-y-auto">
            {duplicates.map((group) => (
              <div key={group.accountId} className="flex flex-col gap-y-1 py-2">
                <Address address={toAddress(group.address)} showIcon iconSize={20} variant="truncate" />
                <FootnoteText className="text-text-tertiary">
                  {t('addressBook.importContacts.duplicates.namesLabel')}
                </FootnoteText>
                <BodyText className="text-text-secondary">{group.names.join(', ')}</BodyText>
              </div>
            ))}
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer align="end">
        <Button variant="fill" onClick={onClose}>
          {t('addressBook.importContacts.duplicates.closeButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
