import { useI18n } from '@/shared/i18n';
import { cnTw, nullable } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { Skeleton, Tooltip } from '@/shared/ui-kit';
import { type ChainError } from '@/aggregates/basket-operations';

type Props = {
  validating?: boolean;
  errorText?: string;
  error?: ChainError;
};

export const BasketOperationStatus = ({ validating, errorText, error }: Props) => {
  const { t, formatDate } = useI18n();

  let errorMessage;
  let label;
  let variant;

  if (errorText) {
    errorMessage = t(errorText);
    label = t('basket.validationError');
    variant = 'error';
  }
  if (error) {
    errorMessage = t(error.message);
    label = t('basket.chainError', {
      date: formatDate(error.at, 'dd/MM/yy'),
    });
    variant = 'warning';
  }

  if (nullable(errorMessage) && nullable(label) && nullable(variant)) {
    return null;
  }

  return (
    <Skeleton active={!!validating}>
      <Tooltip>
        <Tooltip.Trigger>
          <div
            className={cnTw('flex w-[108px] shrink-0 items-center justify-center gap-x-1 rounded-md px-2 py-0.5', {
              'bg-badge-red-background-default text-text-negative': variant === 'error',
              'bg-badge-orange-background-default text-text-warning': variant === 'warning',
            })}
          >
            <HelpText className="text-inherit">{label}</HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{errorMessage}</Tooltip.Content>
      </Tooltip>
    </Skeleton>
  );
};
