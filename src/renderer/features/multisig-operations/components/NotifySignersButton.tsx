import { useUnit } from 'effector-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { nudgeErrorMessage, operationsService } from '@/domains/backend';
import { type MultisigOperation, MultisigOperationStatus } from '@/domains/network';
import { backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

type Props = {
  operation: MultisigOperation;
};

export const NotifySignersButton = ({ operation }: Props) => {
  const { t } = useI18n();
  const { baseUrl, isHealthy } = useUnit({
    baseUrl: backendConfigurationModel.$backendUrl,
    isHealthy: backendContactsModel.$isHealthy,
  });

  const [isNotifying, setIsNotifying] = useState(false);

  // Visible only when the backend is connected and the operation is still pending.
  // The backend enforces creator/approver authorization; a 403 is surfaced as a toast.
  const canNotify = Boolean(baseUrl) && isHealthy && operation.status === MultisigOperationStatus.Pending;
  if (!canNotify) return null;

  const handleNotify = async () => {
    if (!baseUrl) return;

    setIsNotifying(true);
    try {
      const result = await operationsService.nudge(baseUrl, operation.id);
      const unreachable = result.failed + result.skipped;
      if (result.notified > 0) {
        if (unreachable > 0) {
          toast.success(t('operation.notifySigners.successPartial', { count: result.notified, unreachable }));
        } else {
          toast.success(t('operation.notifySigners.success', { count: result.notified }));
        }
      } else if (unreachable > 0) {
        toast.error(t('operation.notifySigners.errorTitle'), {
          description: t('operation.notifySigners.deliveryFailed'),
        });
      } else {
        toast(t('operation.notifySigners.nobodyPending'));
      }
    } catch (error) {
      toast.error(t('operation.notifySigners.errorTitle'), { description: nudgeErrorMessage(error, t) });
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button
          className="shrink-0 whitespace-nowrap"
          pallet="secondary"
          variant="fill"
          size="sm"
          prefixElement={<Icon name="notification" size={16} />}
          disabled={isNotifying}
          isLoading={isNotifying}
          onClick={handleNotify}
        >
          {t('operation.notifySigners.button')}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('operation.notifySigners.tooltip')}</Tooltip.Content>
    </Tooltip>
  );
};
