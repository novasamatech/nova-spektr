import { Trans } from 'react-i18next';

import { type ChainError, type ClientError } from '@/shared/core/types/basket';
import { useI18n } from '@/shared/i18n';
import { HelpText } from '@/shared/ui';
import { Skeleton, Tooltip } from '@/shared/ui-kit';

type Props = {
  validating?: boolean;
  errorText?: string;
  error?: ChainError | ClientError;
};

export const BasketOperationStatus = ({ validating, errorText, error }: Props) => {
  const { t } = useI18n();

  if (validating) {
    return <Skeleton width={106} height={18} />;
  }

  if (errorText) {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex w-[106px] items-center justify-center gap-x-1 rounded-md bg-badge-red-background-default px-2 py-0.5">
            <HelpText className="text-text-negative">{t('basket.validationError')} </HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans t={t} i18nKey={errorText} />
        </Tooltip.Content>
      </Tooltip>
    );
  }

  if (error) {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <div className="flex w-[106px] items-center justify-center gap-x-1 rounded-md bg-badge-orange-background-default px-2 py-0.5">
            <HelpText className="text-text-warning">
              {t('basket.chainError', {
                date: (error as ChainError).dateCreated
                  ? // TODO: Use formatDate from i18n
                    new Date((error as ChainError).dateCreated).toLocaleDateString()
                  : '',
              })}
            </HelpText>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans t={t} i18nKey={error.message} />{' '}
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return null;
};
