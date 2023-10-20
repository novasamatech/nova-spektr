import { BaseModal, Button, InfoLink, InputFile } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ImportKeysModal = ({ isOpen, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal isOpen={isOpen} title={t('dynamicDerivations.importKeys.modalTitle')} onClose={onClose}>
      <div className="flex flex-col gap-y-4 items-start">
        <InputFile placeholder={t('dynamicDerivations.importKeys.fileInputPlaceholder')} className="w-full h-[126px]" />

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
