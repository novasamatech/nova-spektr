import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Modal } from '@/shared/ui-kit';

type Props = {
  isOpen: boolean;
  referendumId: ReferendumId;
  onToggle: (open: boolean) => void;
};

export const ReferendumDetailsModal = ({ referendumId, isOpen, onToggle }: Props) => {
  return (
    <Modal size="xl" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{`Referendum #${referendumId}`}</Modal.Title>
      <Modal.Content>
        <div className="bg-main-app-background">
          <Box direction="row" gap={4} padding={4}>
            {/*TODO implement*/}
            {'Here will be some referendum info'}
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
};
