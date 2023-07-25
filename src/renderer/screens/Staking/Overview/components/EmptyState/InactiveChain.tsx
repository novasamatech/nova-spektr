import cn from 'classnames';

import NoConnection from '@images/misc/no-connection.webp';
import { useI18n, Paths } from '@renderer/app/providers';
import { FootnoteText, ButtonLink } from '@renderer/shared/ui';

type Props = {
  className?: string;
};

export const InactiveChain = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-y-1', className)}>
      <img src={NoConnection} alt={t('staking.overview.noAccountsLabel')} width="147" height="147" />
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.networkDisabledLabel')}
      </FootnoteText>
      <FootnoteText className="w-52 text-center text-text-tertiary">
        {t('staking.overview.networkDisabledDescription')}
      </FootnoteText>
      <ButtonLink size="sm" className="mt-4" to={Paths.NETWORK}>
        {t('staking.overview.networkSettingsLink')}
      </ButtonLink>
    </div>
  );
};
