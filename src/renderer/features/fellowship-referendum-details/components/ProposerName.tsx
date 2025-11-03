import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable, toAddress } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { referendumService, trackService, useTracks } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { details } from '../model/details';
import { fellowshipReferendumsDetailsFeature } from '../model/feature';
import { detailsService } from '../service';

export const ProposerName = () => {
  const { t } = useI18n();

  const api = useFellowshipApi();

  const input = useUnit(fellowshipReferendumsDetailsFeature.input);
  const proposer = useUnit(details.$proposer);
  const identity = useUnit(details.$proposerIdentity);
  const isProposerLoading = useUnit(details.$pendingProposer);
  const referendum = useUnit(details.$referendum);
  const tracks = useTracks({ palletType: 'fellowship', api });

  if (nullable(proposer) || nullable(input)) {
    return null;
  }

  const address = toAddress(proposer, { prefix: input.chain.addressPrefix });

  const shouldRenderPending = isProposerLoading && !identity && !address;

  const proposerName = !shouldRenderPending ? (
    <Address
      showIcon
      title={identity ? identityService.getFullName(identity) : undefined}
      address={address}
      hideAddress
      variant="truncate"
    />
  ) : null;

  const proposerLoader = shouldRenderPending ? <Skeleton height="1lh" width="40ch" /> : null;

  if (!proposerName && !proposerLoader) return null;

  const track =
    referendum &&
    referendumService.isOngoing(referendum) &&
    (trackService.isPromotionTrack(referendum.track) || trackService.isRetentionTrack(referendum.track)) &&
    detailsService.getRankTitle(referendum.track, tracks);

  return (
    <div className="flex items-center gap-2 text-footnote">
      <span className="text-text-secondary">{t('governance.referendum.proposer')}</span>
      {proposerName}
      {proposerLoader}
      {track && (
        <div className="flex gap-1 text-nowrap text-text-secondary">
          <Icon name="promoteVoting" size={16} />
          {track}
        </div>
      )}
    </div>
  );
};
