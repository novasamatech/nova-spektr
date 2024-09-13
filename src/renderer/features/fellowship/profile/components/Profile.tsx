import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Skeleton } from '@/shared/ui-kit';
import { BodyText, FootnoteText, Icon, Plate } from '@shared/ui';
import { profileModel } from '../model/profile';

type Props = {
  onClick: () => void;
};

export const Profile = ({ onClick }: Props) => {
  const { t } = useI18n();
  const isLoading = useUnit(profileModel.$isLoading);
  const fellowshipAccount = useUnit(profileModel.$fellowshipAccount);

  return (
    <button disabled={isLoading} onClick={onClick}>
      <Plate className="flex h-[90px] w-[240px] items-center justify-between overflow-hidden px-4 pb-4.5 pt-3">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-1">
            <Icon name="profile" size={16} />
            <FootnoteText>{t('fellowship.yourProfile')}</FootnoteText>
          </div>
          <Skeleton active={isLoading}>
            <BodyText className="text-small-title">
              {/* TODO: change to identety */}
              {fellowshipAccount ? fellowshipAccount.accountId : t('fellowship.yourProfile')}
            </BodyText>
          </Skeleton>
        </div>
        <Icon name="arrowRight" />
      </Plate>
    </button>
  );
};
