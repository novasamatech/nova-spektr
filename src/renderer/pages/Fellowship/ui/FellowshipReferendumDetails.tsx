import { generatePath, useParams } from 'react-router-dom';

import { referendaPallet } from '@/shared/pallet/referenda';
import { Paths } from '@/shared/routes';
import { ReferendumDetailsModal } from '@/features/fellowship-referendum-details';
import { navigationModel } from '@/features/navigation';

export const FellowshipReferendumDetails = () => {
  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  if (!chainId || !referendumId) {
    return null;
  }

  const id = referendaPallet.helpers.toReferendumId(parseInt(referendumId));

  return (
    <ReferendumDetailsModal
      referendumId={id}
      isOpen={true}
      onClose={() => navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId }))}
    />
  );
};
