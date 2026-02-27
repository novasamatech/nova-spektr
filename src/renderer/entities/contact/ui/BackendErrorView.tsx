import { useI18n } from '@/shared/i18n';
import { BodyText, Button, Icon } from '@/shared/ui';

type Props = {
  error: string;
  onRetry: () => void;
};

export const BackendErrorView = ({ error, onRetry }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-3 py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-badge-red-background-default">
        <Icon name="warnCutout" size={20} className="text-text-negative" />
      </div>
      <BodyText className="text-text-tertiary">{t('addressBook.sources.loadError')}</BodyText>
      <BodyText className="max-w-full text-center text-caption break-all text-text-tertiary">{error}</BodyText>
      <Button variant="text" className="h-4.5" onClick={onRetry}>
        {t('addressBook.sources.retry')}
      </Button>
    </div>
  );
};
