import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';

const StatusTitle: Record<MultisigOperation['status'], string> = {
  pending: 'operation.status.signing',
  cancelled: 'operation.status.cancelled',
  error: 'operation.status.error',
  executed: 'operation.status.executed',
};

const StatusBorder: Record<MultisigOperation['status'], string> = {
  pending: 'border-divider',
  cancelled: 'border-text-negative/30',
  error: 'border-text-negative/30',
  executed: 'border-text-positive/30',
};

const StatusText: Record<MultisigOperation['status'], string> = {
  pending: 'text-text-secondary',
  cancelled: 'text-text-negative',
  error: 'text-text-negative',
  executed: 'text-text-positive',
};

type Props = {
  status: MultisigOperation['status'];
  signed: number;
  threshold: number;
};

export const Status = ({ status, signed, threshold }: Props) => {
  const { t } = useI18n();

  const text = status === 'pending' ? t('operation.signing', { signed, threshold }) : t(StatusTitle[status]);

  return (
    <div
      className={cnTw(
        'inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-[3px]',
        StatusBorder[status],
      )}
    >
      <CaptionText className={cnTw('uppercase', StatusText[status])}>{text}</CaptionText>
    </div>
  );
};
