import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

type Props = {
  text: string;
};

export const EmptyBasket = ({ text }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Graphics name="emptyList" alt={t('basket.noOperationsLabel')} size={178} />
      <BodyText className="text-text-tertiary w-[300px] text-center">
        <Trans t={t} i18nKey={text} />
      </BodyText>
    </div>
  );
};
