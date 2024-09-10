import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { BodyText, FootnoteText, Icon, Plate, Shimmering } from '@shared/ui';
import { membersAggregate } from '../aggregates/members';

type Props = {
  onClick: () => void;
};

export const Members = ({ onClick }: Props) => {
  const { t } = useI18n();

  const members = useUnit(membersAggregate.$members);
  const isLoading = useUnit(membersAggregate.$isLoading);

  return (
    <button disabled={isLoading} onClick={onClick}>
      <Plate className="flex h-[90px] w-[240px] items-center justify-between px-4 pb-4.5 pt-3">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-1">
            <Icon name="members" size={16} />
            <FootnoteText>{t('fellowship.members')}</FootnoteText>
          </div>
          {isLoading ? (
            <Shimmering width={120} height={18} />
          ) : (
            <BodyText className="text-small-title">{t('fellowship.fellow', { count: members.length })}</BodyText>
          )}
        </div>
        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
