import { useStoreMap, useUnit } from 'effector-react';

import { Markdown, Shimmering } from '@shared/ui';
import { TrackInfo, referendumService } from '@entities/governance';
import { pickNestedValue } from '@shared/lib/utils';
import { type ChainId, type Referendum } from '@shared/core';
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
        <div className="flex flex-col gap-4">
          <Shimmering height={44} />
          <div className="flex flex-col gap-3">
            <Shimmering height={18} />
            <Shimmering height={18} width={240} />
            <Shimmering height={300} />
          </div>
        </div>
      )}

      {!isDescriptionLoading && description && <Markdown>{description}</Markdown>}
    </div>
  );
};
