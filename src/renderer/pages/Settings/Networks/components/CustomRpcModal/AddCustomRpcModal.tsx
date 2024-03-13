import { AddCustomRpcModal } from '@features/network';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const AddCustomRpcModalDisplay = ({ isOpen, onClose }: Props) => (
  <AddCustomRpcModal isOpen={isOpen} onClose={onClose} />
);
