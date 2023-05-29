import cn from 'classnames';

import NoConnection from '@images/misc/no-connection.webp';
import { useI18n } from '@renderer/context/I18nContext';
import { FootnoteText, ButtonLink } from '@renderer/components/ui-redesign';
import Paths from '@renderer/routes/paths';

type Props = {
  className?: string;
};

const InactiveChain = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-y-7', className)}>
      <img src={NoConnection} alt={t('staking.overview.noAccountsLabel')} width="178" height="172" />
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.networkDisabledLabel')}
      </FootnoteText>
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.networkDisabledDescription')}
      </FootnoteText>
      <ButtonLink className="mt-5" to={Paths.NETWORK}>
        {t('staking.overview.networkSettingsLink')}
      </ButtonLink>
    </div>
  );
};

export default InactiveChain;
