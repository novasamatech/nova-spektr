import cn from 'classnames';

import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';

type Props = {
  className?: string;
};

const NoAccounts = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-y-4', className)}>
      <Icon as="img" name="emptyList" alt={t('staking.overview.noAccountsLabel')} size={178} />
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.noAccountsLabel')}
      </FootnoteText>
    </div>
  );
};

export default NoAccounts;
