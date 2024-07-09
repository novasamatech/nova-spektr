import { useStoreMap, useUnit } from 'effector-react';

import { Loader, Markdown } from '@shared/ui';
import { referendumService, TrackInfo } from '@entities/governance';
import { pickNestedValue } from '@shared/lib/utils';
import { ChainId, Referendum } from '@shared/core';
import { detailsAggregate } from '../../aggregates/details';
import { ProposerName } from './ProposerName';

type Props = {
  chainId: ChainId;
  referendum: Referendum;
};

export const ProposalDescription = ({ chainId, referendum }: Props) => {
  const isDescriptionLoading = useUnit(detailsAggregate.$isDescriptionLoading);
  const description = useStoreMap({
    store: detailsAggregate.$descriptions,
    keys: [chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  return (
    <div>
      <div className="flex items-center mb-4">
        <ProposerName chainId={chainId} referendum={referendum} />
        <div className="grow" />
        {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
      </div>

      {isDescriptionLoading && (
        <div className="flex justify-center items-center min-h-32">
          <Loader color="primary" size={25} />
        </div>
      )}

      {!isDescriptionLoading && description && <Markdown>{description}</Markdown>}
    </div>
  );
};
