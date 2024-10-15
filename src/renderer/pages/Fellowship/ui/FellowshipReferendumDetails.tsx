import { generatePath, useParams } from 'react-router-dom';

import { referendaPallet } from '@/shared/pallet/referenda';
import { Paths } from '@shared/routes';
import { fellowshipReferendumDetailsFeature } from '@features/fellowship-referendum-details';
import { navigationModel } from '@features/navigation';

const { ReferendumDetailsModal } = fellowshipReferendumDetailsFeature.views;

export const FellowshipReferendumDetails = () => {
  const { chainId, referendumId } = useParams<'chainId' | 'referendumId'>();

  if (!chainId || !referendumId) {
    return null;
  }

  const id = referendaPallet.helpers.toReferendumId(parseInt(referendumId));

  return (
    <ReferendumDetailsModal
      referendumId={id}
      isOpen
      onToggle={() => navigationModel.events.navigateTo(generatePath(Paths.FELLOWSHIP_LIST, { chainId }))}
    />
  );
};
