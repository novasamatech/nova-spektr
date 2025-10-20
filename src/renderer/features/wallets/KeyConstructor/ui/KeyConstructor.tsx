import { useUnit } from 'effector-react';
import { memo, useEffect, useState } from 'react';

import { type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useKeyCombo } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type DerivationKeyDraft, constructorModel } from '../model/constructor-model';

import { KeyItem } from './KeyItem';
import { ShortcutIcon } from './ShortcutIcon';
import { WarningModal } from './WarningModal';

const ADD_NEW_KEY_SHORTCUT = ['shift', 'enter'];

type Props = {
  title: string;
  isOpen: boolean;
  existingKeys: (VaultChainAccount | VaultShardAccount)[];
  onClose: () => void;
  onConfirm: (keys: DerivationKeyDraft[]) => void;
};

export const KeyConstructor = memo(({ title, isOpen, existingKeys, onClose, onConfirm }: Props) => {
  const { t } = useI18n();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const addNewKeyShortcutPressed = useKeyCombo(ADD_NEW_KEY_SHORTCUT);

  const keys = useUnit(constructorModel.$keys);
  const hasChanged = useUnit(constructorModel.$hasChanged);
  const canSubmit = useUnit(constructorModel.$canSubmit);

  useEffect(() => {
    if (!isOpen) return;

    constructorModel.init(existingKeys);
  }, [isOpen, existingKeys]);

  useEffect(() => {
    if (!addNewKeyShortcutPressed) return;

    constructorModel.addKey();
  }, [addNewKeyShortcutPressed]);

  useEffect(() => {
    if (!canSubmit) return;

    onConfirm(Object.values(keys));
  }, [canSubmit, keys]);

  const closeConstructor = () => {
    if (hasChanged) {
      setIsWarningOpen(true);
    } else {
      onClose();
    }
  };

  const confirmCloseConstructor = () => {
    setIsWarningOpen(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} size="lg" height="full" onToggle={closeConstructor}>
      <Modal.Title close>{t('dynamicDerivations.keysConstructor.title', { title })}</Modal.Title>

      <Modal.Content>
        <div className="h-full px-5 py-4">
          {Object.entries(keys).map(([keyId], index) => (
            <KeyItem key={keyId} keyId={keyId} keyIndex={index + 1} />
          ))}
          <Button
            variant="text"
            pallet="primary"
            size="sm"
            suffixElement={<ShortcutIcon />}
            onClick={() => constructorModel.addKey()}
          >
            {t('dynamicDerivations.keysConstructor.addNewKeyButton')}
          </Button>
        </div>
      </Modal.Content>

      <Modal.Footer align="between">
        <Button variant="text" onClick={closeConstructor}>
          {t('dynamicDerivations.keysConstructor.backButton')}
        </Button>
        <Button onClick={() => constructorModel.submit()}>{t('dynamicDerivations.keysConstructor.saveButton')}</Button>
      </Modal.Footer>

      <WarningModal
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        onConfirm={confirmCloseConstructor}
      />
    </Modal>
  );
});

KeyConstructor.displayName = 'KeyConstructor';
