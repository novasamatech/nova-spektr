import { useUnit } from 'effector-react';

import { BaseModal, Button, InfoLink, InputFile, InputHint } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { importKeysModel } from '@renderer/entities/dynamicDerivations';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ImportKeysModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const error = useUnit(importKeysModel.$error);

  const handleFileUpload = (file: File) => {
    const fileReader = new FileReader();
    fileReader.onloadend = (e) => {
      if (e.target?.result) {
        importKeysModel.events.fileUploaded(e.target['result'] as string);
      }
    };

    fileReader.readAsText(file);
  };

  return (
    <BaseModal isOpen={isOpen} title={t('dynamicDerivations.importKeys.modalTitle')} onClose={onClose}>
      <div className="flex flex-col gap-y-4 items-start">
        <InputHint active variant="error">
          {error?.error}
        </InputHint>
        <InputFile
          placeholder={t('dynamicDerivations.importKeys.fileInputPlaceholder')}
          accept=".yaml"
          className="w-full h-[126px]"
          onChange={(file) => handleFileUpload(file)}
        />

        <InfoLink
          url="dd-template.yaml"
          className="gap-x-1 mt-2 px-3"
          iconName="import"
          iconPosition="right"
          download
          target="_self"
        >
          {t('dynamicDerivations.importKeys.downloadTemplateButton')}
        </InfoLink>
      </div>

      <div className="flex items-center justify-between pt-3">
        <Button variant="text">{t('dynamicDerivations.importKeys.backButton')}</Button>
        <Button disabled>{t('dynamicDerivations.importKeys.continueButton')}</Button>
      </div>
    </BaseModal>
  );
};
