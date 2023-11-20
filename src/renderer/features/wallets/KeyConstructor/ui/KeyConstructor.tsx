import { BaseModal, Button } from '@shared/ui';
import { KeyForm } from './KeyForm';
import { KeysList } from './KeysList';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const KeyConstructor = ({ isOpen, onClose, onConfirm }: Props) => {
  return (
    <BaseModal
      closeButton
      contentClass="flex flex-col h-[calc(100%-46px)]"
      panelClass="w-[784px] h-[678px]"
      title="Add keys for My Novasama vault"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="px-5 pt-4 pb-6 border-b border-divider">
        <KeyForm />
      </div>
      <div className="flex-1 mt-4 overflow-y-auto">
        <KeysList />
      </div>
      <div className="flex justify-between pt-3 px-5 pb-4">
        <Button variant="text" onClick={() => console.log('BACK')}>
          Back
        </Button>
        <Button onClick={() => console.log('SAVE')}>Save</Button>
      </div>
    </BaseModal>
  );
};
