import { Outlet, generatePath, useParams } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { Box } from '@/shared/ui-kit';
import { type Referendum } from '@/domains/collectives';
import { fellowshipReferendumsFeature } from '@/features/fellowship-referendums';
import { navigationModel } from '@/features/navigation';

const { Referendums, Filters } = fellowshipReferendumsFeature.views;

export const FellowshipReferendumList = () => {
  const { chainId } = useParams<'chainId'>();

  if (!chainId) {
    return null;
  }

  const navigate = (referendum: Referendum) => {
    navigationModel.events.navigateTo(
      generatePath(Paths.FELLOWSHIP_REFERENDUM, {
        chainId,
        referendumId: referendum.id.toString(),
      }),
    );
  };

  return (
    <Box gap={4} grow={1}>
      <Filters />
      <Referendums onSelect={navigate} />
      <Outlet />
    </Box>
  );
};
