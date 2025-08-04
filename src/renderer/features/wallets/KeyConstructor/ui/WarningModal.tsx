import { useI18n } from '@/shared/i18n';
import { BaseModal, Button, FootnoteText, SmallTitleText } from '@/shared/ui';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};
export const WarningModal = ({ isOpen, onClose, onConfirm }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      isOpen={isOpen}
      panelClass="w-[240px]"
      title={<SmallTitleText>{t('dynamicDerivations.keysConstructor.warnModalTitle')}</SmallTitleText>}
      onClose={onClose}
    >
      <FootnoteText className="pt-2 pb-4 text-center text-text-tertiary">
        {t('dynamicDerivations.keysConstructor.warnModalDescription')}
      </FootnoteText>
      <div className="flex items-center justify-center gap-x-4">
        <Button size="sm" variant="text" className="w-[88px]" onClick={onClose}>
          {t('dynamicDerivations.keysConstructor.warnModalCancelButton')}{' '}
        </Button>
        <Button size="sm" pallet="error" className="w-[88px]" onClick={onConfirm}>
          {t('dynamicDerivations.keysConstructor.warnModalLeaveButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
