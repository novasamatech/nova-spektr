import { useStoreMap, useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText, InfoLink, Plate, SmallTitleText } from '@/shared/ui';
import { proposerIdentityAggregate } from '@/features/governance';
import { getIdentityList } from '../lib/utils';
import { delegateDetailsModel } from '../model/delegate-details-model';

export const DelegateIdentity = () => {
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
        <SmallTitleText>{t('governance.addDelegation.delegateIdentity')}</SmallTitleText>
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
