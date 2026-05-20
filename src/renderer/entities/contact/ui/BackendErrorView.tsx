import { useI18n } from '@/shared/i18n';
import { Alert, Button, CaptionText } from '@/shared/ui';

export type BackendErrorCategory = 'auth' | 'forbidden' | 'timeout' | 'network' | 'generic';
export type BackendError = { category: BackendErrorCategory; message?: string };

type Props = {
  category: BackendErrorCategory;
  message?: string;
  onRetry: () => void;
};

export const i18nKeyByCategory: Record<BackendErrorCategory, string> = {
  auth: 'addressBook.sources.errorAuth',
  forbidden: 'addressBook.sources.errorForbidden',
  timeout: 'addressBook.sources.errorTimeout',
  network: 'addressBook.sources.errorNetwork',
  generic: 'addressBook.sources.errorGeneric',
};

export const BackendErrorView = ({ category, message, onRetry }: Props) => {
  const { t } = useI18n();

  return (
    <div className="py-4">
      <Alert title={t(i18nKeyByCategory[category])} active variant="error">
        {message && <CaptionText className="break-all text-text-tertiary">{message}</CaptionText>}
        <Button variant="text" className="h-4.5 self-start p-0" onClick={onRetry}>
          {t('addressBook.sources.retry')}
        </Button>
      </Alert>
    </div>
  );
};
