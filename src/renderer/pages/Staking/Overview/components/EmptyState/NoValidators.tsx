import { useI18n } from '@renderer/app/providers';
import { BodyText } from '@renderer/shared/ui';
import { cnTw } from '@renderer/shared/lib/utils';
import EmptyList from '@renderer/assets/images/misc/empty-list.webp';

type Props = {
  className?: string;
};

export const NoValidators = ({ className }: Props) => {
  const { t } = useI18n();

  return (
    <div className={cnTw('flex flex-col items-center justify-center gap-y-4', className)}>
      <img src={EmptyList} alt={t('staking.overview.noValidatorsLabel')} width={178} height={178} />
      <BodyText className="w-52 text-center text-text-tertiary">{t('staking.overview.noValidatorsLabel')}</BodyText>
    </div>
  );
};
