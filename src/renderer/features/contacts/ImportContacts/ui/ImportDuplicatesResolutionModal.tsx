import { useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { Button, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { type DuplicateResolutions } from '../lib/types';
import { importContactsModel } from '../model/import-contacts-model';

type Props = {
  onClose: () => void;
};

export const ImportDuplicatesResolutionModal = ({ onClose }: Props) => {
  const { t } = useI18n();
  const importState = useUnit(importContactsModel.$importState);
  const duplicates = importState.status === 'duplicates' ? importState.duplicates : [];

  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const currentGroup = duplicates[index];

  if (!currentGroup) return null;

  const isLast = index === duplicates.length - 1;
  const showProgress = duplicates.length > 1;

  const handleSelect = (name: string) => {
    const nextSelections = { ...selections, [currentGroup.accountId]: name };
    setSelections(nextSelections);

    if (!isLast) {
      setIndex((i) => i + 1);

      return;
    }

    const resolutions: DuplicateResolutions = {};
    for (const group of duplicates) {
      resolutions[group.accountId] = nextSelections[group.accountId] ?? null;
    }
    importContactsModel.events.resolveDuplicates(resolutions);
  };

  return (
    <Modal isOpen={true} size="md" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>
        {showProgress
          ? `${t('addressBook.importContacts.duplicates.title')} (${index + 1}/${duplicates.length})`
          : t('addressBook.importContacts.duplicates.title')}
      </Modal.Title>
      <Modal.Content>
        <div className="mt-4 flex flex-col items-start gap-y-4 px-5 pb-5">
          <SmallTitleText className="text-text-primary">
            {t('addressBook.importContacts.duplicates.description')}
          </SmallTitleText>

          <div className="flex max-h-96 w-full flex-col gap-y-1 overflow-y-auto">
            {currentGroup.names.map((name, idx) => (
              <button
                key={`${currentGroup.accountId}-${idx}`}
                type="button"
                className={cnTw(
                  'w-full cursor-pointer rounded-sm border border-transparent px-3 py-2 text-left transition',
                  'hover:border-active-container-border hover:bg-hover',
                )}
                onClick={() => handleSelect(name)}
              >
                <Address
                  address={toAddress(currentGroup.address)}
                  showIcon
                  iconSize={20}
                  variant="truncate"
                  title={name}
                />
              </button>
            ))}
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer align="end">
        <Button variant="fill" pallet="secondary" onClick={onClose}>
          {t('addressBook.importContacts.duplicates.cancelButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
