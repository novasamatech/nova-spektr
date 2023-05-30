import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import EmptyList from '@images/misc/empty-list.webp';
import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  className?: string;
};

const NoAccounts = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-y-4', className)}>
      <img src={EmptyList} alt={t('staking.overview.noAccountsLabel')} width="178" height="172" />
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.noAccountsLabel')}
      </FootnoteText>
    </div>
  );
};

export default NoAccounts;
