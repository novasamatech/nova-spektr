import { useStoreMap, useUnit } from 'effector-react';

import { type ChainId, type Referendum } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { HeaderTitleText, Markdown, Shimmering } from '@shared/ui';
import { TrackInfo, referendumService } from '@entities/governance';
import { detailsAggregate } from '../../aggregates/details';

import { ProposerName } from './ProposerName';

type Props = {
  chainId: ChainId;
  addressPrefix: number;
  referendum: Referendum;
};

export const ProposalDescription = ({ chainId, addressPrefix, referendum }: Props) => {
  const isDescriptionLoading = useUnit(detailsAggregate.$isDescriptionLoading);
  const description = useStoreMap({
    store: detailsAggregate.$descriptions,
    keys: [chainId, referendum.referendumId],
    fn: (descriptions, [chainId, index]) => pickNestedValue(descriptions, chainId, index),
  });

  const isTitlesLoading = useUnit(detailsAggregate.$isTitlesLoading);
  const title = useStoreMap({
    store: detailsAggregate.$titles,
    keys: [referendum.referendumId],
    fn: (titles, [index]) => titles[index],
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <ProposerName referendum={referendum} addressPrefix={addressPrefix} />
        <div className="grow" />
        {referendumService.isOngoing(referendum) && <TrackInfo trackId={referendum.track} />}
      </div>

      <div className="flex flex-col gap-4">
        <HeaderTitleText className="text-balance">
          {!title && isTitlesLoading ? <Shimmering height="1em" /> : title}
        </HeaderTitleText>

        {isDescriptionLoading && (
          <div className="flex flex-col gap-3">
            <Shimmering height={18} />
            <Shimmering height={18} width={240} />
            <Shimmering height={300} />
          </div>
        )}

        {!isDescriptionLoading && description && <Markdown>{description}</Markdown>}
      </div>
    </div>
  );
};
