import { generatePath, useParams } from 'react-router-dom';

import { Slot, createSlot } from '@/shared/di';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { Paths } from '@/shared/routes';
import { navigationModel } from '@/features/navigation';

export const referendumDetalsPageRouteSlot = createSlot<{
  referendumId: ReferendumId;
  isOpen: boolean;
  onToggle: (open: boolean) => unknown;
}>();

export const FellowshipReferendumDetails = () => {
  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  if (!chainId || !referendumId) {
    return null;
  }

  const id = referendaPallet.helpers.toReferendumId(parseInt(referendumId));

  return (
    <Slot
      id={referendumDetalsPageRouteSlot}
      props={{
        referendumId: id,
        isOpen: true,
        onToggle: () => navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId })),
      }}
    />
  );
};
