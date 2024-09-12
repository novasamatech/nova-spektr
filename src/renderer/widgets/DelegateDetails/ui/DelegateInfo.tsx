import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { Button, DetailRow, FootnoteText, InfoLink, Plate, SmallTitleText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { proposerIdentityAggregate } from '@/features/governance';
import { getIdentityList } from '../lib/utils';
import { delegateDetailsModel } from '../model/delegate-details-model';

export const DelegateInfo = () => (
  <>
    <Plate className="w-[350px] border-filter-border p-6 shadow-card-shadow">
      <DelegateActivity />
    </Plate>
    <DelegateIdentity />
  </>
);

const DelegateActivity = () => {
  const { t } = useI18n();

  const chain = useUnit(delegateDetailsModel.$chain);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  if (!delegate) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SmallTitleText>{t('governance.addDelegation.delegateActivity')}</SmallTitleText>
        <Button pallet="primary" variant="text" size="sm" className="px-0" onClick={() => {}}>
          {t('governance.addDelegation.viewSummary')}
        </Button>
      </div>

      <DetailRow
        label={<FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.votes')}</FootnoteText>}
      >
        <AssetBalance
          showSymbol={false}
          value={delegate.delegatorVotes?.toString() || '0'}
          asset={chain?.assets[0]}
          className="text-footnote"
        />
      </DetailRow>

      <DetailRow
        label={
          <FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.delegations')}</FootnoteText>
        }
      >
        <FootnoteText>{delegate.delegators || '0'}</FootnoteText>
      </DetailRow>

      <DetailRow
        label={<FootnoteText className="text-text-secondary">{t('governance.addDelegation.card.voted')}</FootnoteText>}
      >
        <FootnoteText>{delegate.delegateVotesMonth || '0'}</FootnoteText>
      </DetailRow>
      <DetailRow
        label={
          <FootnoteText className="text-text-secondary">{t('governance.addDelegation.votedAllTime')}</FootnoteText>
        }
      >
        <FootnoteText>{delegate.delegateVotes || '0'}</FootnoteText>
      </DetailRow>
    </div>
  );
};

const DelegateIdentity = () => {
  const { t } = useI18n();
  const delegate = useUnit(delegateDetailsModel.$delegate);

  const identity = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [delegate?.address],
    fn: (proposers, [address]) => (address ? (proposers[address] ?? null) : null),
  });

  if (!delegate || !identity) return null;

  return (
    <Plate className="w-[350px] border-filter-border p-6 shadow-card-shadow">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <SmallTitleText>{t('governance.addDelegation.delegateIdentity')}</SmallTitleText>
        </div>
        {getIdentityList(identity).map(({ key, value, url }) => (
          <DetailRow key={key} label={<FootnoteText className="text-text-secondary">{key}</FootnoteText>}>
            <InfoLink url={url} className="text-tab-text-accent">
              {value}
            </InfoLink>
          </DetailRow>
        ))}
      </div>
    </Plate>
  );
};
