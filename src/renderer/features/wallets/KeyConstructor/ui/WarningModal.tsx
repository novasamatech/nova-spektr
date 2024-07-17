import { useI18n } from '@app/providers';
import { BaseModal, Button, FootnoteText, SmallTitleText } from '@shared/ui';

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
      title={<SmallTitleText>{t('dynamicDerivations.constructor.warnModalTitle')}</SmallTitleText>}
      onClose={onClose}
    >
      <FootnoteText className="text-text-tertiary text-center pt-2 pb-4">
        {t('dynamicDerivations.constructor.warnModalDescription')}
      </FootnoteText>
      <div className="flex gap-x-4 items-center justify-center">
        <Button size="sm" variant="text" className="w-[88px]" onClick={onClose}>
          {t('dynamicDerivations.constructor.warnModalCancelButton')}{' '}
        </Button>
        <Button size="sm" pallet="error" className="w-[88px]" onClick={onConfirm}>
          {t('dynamicDerivations.constructor.warnModalLeaveButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
