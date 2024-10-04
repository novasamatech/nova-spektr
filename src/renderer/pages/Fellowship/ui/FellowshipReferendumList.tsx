import { Outlet, generatePath, useParams } from 'react-router-dom';

import { Box } from '@/shared/ui-kit';
import { Paths } from '@shared/routes';
import { fellowshipReferendumsFeature } from '@/features/fellowship-referendums';
import { navigationModel } from '@features/navigation';

const { Referendums, Filters } = fellowshipReferendumsFeature.views;

export const FellowshipReferendumList = () => {
  const { chainId } = useParams<'chainId'>();

  if (!chainId) {
    return null;
  }

  return (
    <Box gap={3}>
      <Filters />
      <Referendums
        onSelect={(referendum) => {
          navigationModel.events.navigateTo(
            generatePath(Paths.FELLOWSHIP_REFERENDUM, {
              chainId,
              referendumId: referendum.id.toString(),
            }),
          );
        }}
      />
      <Outlet />
    </Box>
  );
};
