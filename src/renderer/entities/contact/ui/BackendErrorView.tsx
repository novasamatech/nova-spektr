import { useI18n } from '@/shared/i18n';
import { Alert, Button, CaptionText } from '@/shared/ui';

type Props = {
  error: string;
  onRetry: () => void;
};

function getErrorMessageKey(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'addressBook.sources.errorAuth';
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return 'addressBook.sources.errorTimeout';
  }

  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('cors') ||
    lower.includes('dns')
  ) {
    return 'addressBook.sources.errorNetwork';
  }

  return 'addressBook.sources.errorGeneric';
}

export const BackendErrorView = ({ error, onRetry }: Props) => {
  const { t } = useI18n();

  return (
    <div className="py-4">
      <Alert title={t(getErrorMessageKey(error))} active variant="error">
        <CaptionText className="break-all text-text-tertiary">{error}</CaptionText>
        <Button variant="text" className="h-4.5 self-start p-0" onClick={onRetry}>
          {t('addressBook.sources.retry')}
        </Button>
      </Alert>
    </div>
  );
};
