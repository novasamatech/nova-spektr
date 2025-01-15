import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Graphics name="emptyList" size={178} />
      <BodyText className="w-[300px] text-center text-text-tertiary">
        {t('onboarding.polkadotExtension.emptyState')}
      </BodyText>
    </div>
  );
};
