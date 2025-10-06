import { useUnit } from 'effector-react';

import { Button } from '@/shared/ui/Buttons/Button/Button';
import { openFellowshipOverviewModal } from '../model/modal';

export const FellowshipOverviewButton = () => {
  const openModal = useUnit(openFellowshipOverviewModal);

  return (
    <Button onClick={openModal} variant="fill" pallet="primary" size="md">
      Fellowship Overview
    </Button>
  );
};
