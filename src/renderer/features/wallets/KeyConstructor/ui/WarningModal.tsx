import { BaseModal, Button, FootnoteText, SmallTitleText } from '@shared/ui';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};
export const WarningModal = ({ isOpen, onClose, onConfirm }: Props) => {
  return (
    <BaseModal
      isOpen={isOpen}
      panelClass="w-[240px]"
      title={<SmallTitleText>Leave form without changes?</SmallTitleText>}
      onClose={onClose}
    >
      <FootnoteText className="text-text-tertiary text-center pt-2 pb-4">
        Applied changes will not be saved. Are you sure?
      </FootnoteText>
      <div className="flex gap-x-4 items-center justify-center">
        <Button size="sm" variant="text" className="w-[88px]" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" pallet="error" className="w-[88px]" onClick={onConfirm}>
          Leave form
        </Button>
      </div>
    </BaseModal>
  );
};
