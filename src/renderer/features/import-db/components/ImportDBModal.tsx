import { useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, InputHint } from '@/shared/ui';
import { InputFile, Modal } from '@/shared/ui-kit';
import { insert } from '../model/insert';

export const ImportDBModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();

  const validationError = useUnit(insert.$validationError);
  const isDisabled = useUnit(insert.$isDisabled);

  return (
    <Modal size="sm" onToggle={() => insert.events.resetValues()}>
      <Modal.Title close>{t('importDB.importTitle')}</Modal.Title>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content>
        <div className="flex flex-col items-start p-4">
          <div className="flex w-full flex-col gap-y-2">
            <div className="h-[126px]">
              <InputFile
                accept=".json"
                placeholder={t('importDB.fileInputPlaceholder')}
                invalid={nonNullable(validationError)}
                onChange={(file) => insert.events.fileUploaded(file)}
              />
            </div>

            <InputHint active={nonNullable(validationError)} variant="error">
              {t(validationError!)}
            </InputHint>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button disabled={isDisabled} onClick={() => insert.events.importDatabase()}>
          {t('importDB.continueButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
