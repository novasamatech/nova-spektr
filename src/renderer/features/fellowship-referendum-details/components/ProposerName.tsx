import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable, toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { identityService } from '@/domains/network';
import { referendumDetails } from '../model/details';
import { fellowshipReferendumsDetailsFeature } from '../model/feature';

export const ProposerName = () => {
  const { t } = useI18n();

  const input = useUnit(fellowshipReferendumsDetailsFeature.input);
  const proposer = useUnit(referendumDetails.$proposer);
  const identity = useUnit(referendumDetails.$proposerIdentity);
  const isProposerLoading = useUnit(referendumDetails.$pendingProposer);

  if (nullable(proposer) || nullable(input)) {
    return null;
  }

  const address = toAddress(proposer, { prefix: input.chain.addressPrefix });

  const shouldRenderPending = isProposerLoading && !identity;

  const proposerName = !shouldRenderPending ? (
    <Address
      showIcon
      title={identity ? identityService.getFullIdentityName(identity) : undefined}
      address={address}
      hideAddress
      variant="truncate"
    />
  ) : null;

  const proposerLoader = shouldRenderPending ? <Skeleton height="1lh" width="20ch" /> : null;

  if (!proposerName && !proposerLoader) return null;

  return (
    <div className="flex items-center gap-2 text-footnote">
      <span className="text-text-secondary">{t('governance.referendum.proposer')}</span>
      {proposerName}
      {proposerLoader}
    </div>
  );
};
