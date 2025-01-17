import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

type Props = {
  size?: number;
};

export const EmptyAssetsState = ({ size = 178 }: Props) => {
  const { t } = useI18n();

  return (
    <div className="hidden h-full w-full flex-col items-center justify-center gap-y-4 only:flex">
      <Graphics name="emptyList" alt={t('balances.emptyStateLabel')} size={size} />
      <BodyText align="center" className="text-text-tertiary">
        {t('balances.emptyStateLabel')}
        <br />
        {t('balances.emptyStateDescription')}
      </BodyText>
    </div>
  );
};
