import { useStoreMap, useUnit } from 'effector-react';

import { Loader, Markdown } from '@shared/ui';
import { referendumUtils, TrackInfo } from '@entities/governance';
import { pickNestedValue } from '@shared/lib/utils';
import { ChainId, Referendum } from '@shared/core';
import { referendumDetailsModel } from '../model/referendum-details-model';
import { ProposerName } from './ProposerName';

type Props = {
  chainId: ChainId;
  referendum: Referendum;
};

export const ProposalDescription = ({ chainId, referendum }: Props) => {
  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);
  const description = useStoreMap({
    store: referendumDetailsModel.$descriptions,
    keys: [chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  return (
    <div>
      <div className="flex items-center mb-4">
        <ProposerName chainId={chainId} referendum={referendum} />
        <div className="grow" />
        {referendumUtils.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
      </div>

      {isDetailsLoading && (
        <div className="flex justify-center items-center min-h-32">
          <Loader color="primary" size={25} />
        </div>
      )}

      {!isDetailsLoading && description && <Markdown>{description}</Markdown>}
    </div>
  );
};
