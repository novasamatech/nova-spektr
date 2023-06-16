import { useI18n } from '@renderer/context/I18nContext';
import { BodyText } from '@renderer/components/ui-redesign';
import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  className?: string;
};

export const NoValidators = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col items-center justify-center gap-y-4', className)}>
      <Icon as="img" name="emptyList" alt={t('staking.overview.noValidatorsLabel')} size={178} />
      <BodyText className="w-52 text-center text-text-tertiary">{t('staking.overview.noValidatorsLabel')}</BodyText>
    </div>
  );
};
