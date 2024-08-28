import { type BN } from '@polkadot/util';

import { useI18n } from '@/app/providers';
import { type Asset } from '@/shared/core';
import { formatBalance, toNumberWithPrecision } from '@/shared/lib/utils';
import { BodyText } from '@/shared/ui';
import { type DelegateAccount } from '@shared/api/governance';

import { DelegateBadge } from './DelegateBadge';
import { DelegateIcon } from './DelegateIcon';
import { DelegateTitle } from './DelegateTitle';

type Props = {
  delegate: DelegateAccount;
  titleClassName?: string;
  asset?: Asset;
  votes?: BN;
  tracks?: string[];
};

export const DelegateName = ({ delegate, votes, tracks, asset, titleClassName }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-3">
      <DelegateIcon delegate={delegate} />

      <div className="flex flex-1 flex-col">
        <div className="flex grow items-center justify-between gap-2.5">
          <DelegateTitle delegate={delegate} className={titleClassName} />
          <DelegateBadge delegate={delegate} />
        </div>

        <div className="flex gap-1">
          {votes && asset && (
            <BodyText as="span">
              {t('governance.referendum.votes', {
                votes: formatBalance(votes, asset.precision).formatted,
                count: toNumberWithPrecision(votes, asset.precision),
              })}
            </BodyText>
          )}
          {tracks && (
            <BodyText as="span" className="text-text-secondary">
              {t('governance.delegations.tracksLabel', { count: tracks.length })}
            </BodyText>
          )}
        </div>
      </div>
    </div>
  );
};
