import { type ChainError } from '@/shared/core/types/basket';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { Skeleton, Tooltip } from '@/shared/ui-kit';

type Props = {
  validating?: boolean;
  errorText?: string;
  error?: ChainError;
};

export const BasketOperationStatus = ({ validating, errorText, error }: Props) => {
  const { t, formatDate } = useI18n();

  let errorMessage;
  let label;

  if (errorText) {
    errorMessage = t(errorText);
    label = t('basket.validationError');
  }
  if (error) {
    errorMessage = t(error.message);
    label = t('basket.chainError', {
      date: formatDate(error.at, 'dd/MM/yy'),
    });
  }

  if (nullable(errorMessage) && nullable(label)) {
    return null;
  }

  return (
    <Skeleton active={!!validating}>
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex w-[108px] shrink-0 items-center justify-center gap-x-1 rounded-md bg-badge-red-background-default px-2 py-0.5">
            <HelpText className="text-text-negative">{label}</HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{errorMessage}</Tooltip.Content>
      </Tooltip>
    </Skeleton>
  );
};
