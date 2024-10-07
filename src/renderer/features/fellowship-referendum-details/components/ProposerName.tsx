import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { nullable, toAddress } from '@/shared/lib/utils';
import { Identicon } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { referendumDetailsModel } from '../model/details';
import { referendumsDetailsFeatureStatus } from '../model/status';

export const ProposerName = () => {
  const { t } = useI18n();

  const input = useUnit(referendumsDetailsFeatureStatus.input);
  const proposer = useUnit(referendumDetailsModel.$proposer);
  const proposerIdentity = useUnit(referendumDetailsModel.$proposerIdentity);
  const isProposerLoading = useUnit(referendumDetailsModel.$pendingProposer);

  if (nullable(proposer) || nullable(input)) {
    return null;
  }

  const address = toAddress(proposer, { prefix: input.chain.addressPrefix });

  const shouldRenderPending = isProposerLoading && !proposerIdentity;

  const proposerName = !shouldRenderPending ? (
    <>
      <Identicon size={16} address={address} canCopy background={false} />
      {proposerIdentity ? <span>{proposerIdentity.name}</span> : <Address address={address} variant="truncate" />}
    </>
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
