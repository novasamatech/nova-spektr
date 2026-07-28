import { useUnit } from 'effector-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { nudgeErrorMessage, operationsService } from '@/domains/backend';
import { type MultisigOperation, MultisigOperationStatus, multisigOperationService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

type Props = {
  operation: MultisigOperation;
};

export const NotifySignersButton = ({ operation }: Props) => {
  const { t } = useI18n();
  const { baseUrl, isHealthy, authState, backendContacts } = useUnit({
    baseUrl: backendConfigurationModel.$backendUrl,
    isHealthy: backendContactsModel.$isHealthy,
    authState: authModel.$authState,
    backendContacts: contactModel.$backendContacts,
  });

  const [isNotifying, setIsNotifying] = useState(false);

  // Visible only when the backend is connected, the operation is still pending and the multisig is
  // known to the external address book — the backend authorizes callers by that contact's
  // signatories, so nudging an unknown multisig can never succeed.
  const isKnownMultisig = backendContacts.some(contact => contact.accountId === operation.multisigAccountId);
  const canNotify =
    Boolean(baseUrl) &&
    isHealthy &&
    operation.status === MultisigOperationStatus.Pending &&
    !operation.awaitingOutcome &&
    isKnownMultisig;
  if (!canNotify) return null;

  // The backend only authorizes a signatory who has already signed; mirror that rule with the
  // session account so the user sees why the button is inactive instead of hitting a 403.
  const sessionAccountId = authState?.accountId ?? null;
  const hasSigned =
    sessionAccountId !== null &&
    (operation.depositor === sessionAccountId ||
      multisigOperationService.getApprovers(operation).has(sessionAccountId));

  const handleNotify = async () => {
    if (!baseUrl) return;

    setIsNotifying(true);
    try {
      const result = await operationsService.nudge(baseUrl, operation.id);
      const unreachable = result.failed + result.skipped;
      const names = (result.notifiedNames ?? []).join(', ');
      if (result.notified > 0) {
        if (unreachable > 0) {
          toast.success(
            names
              ? t('operation.notifySigners.successNamesPartial', { names, unreachable })
              : t('operation.notifySigners.successPartial', { count: result.notified, unreachable }),
          );
        } else {
          toast.success(
            names
              ? t('operation.notifySigners.successNames', { names })
              : t('operation.notifySigners.success', { count: result.notified }),
          );
        }
      } else if (unreachable > 0) {
        // When every unreached signer is missing a Matrix handle, say so specifically.
        const description =
          result.unreachableNoMatrixId === unreachable
            ? t('operation.notifySigners.errorNoMatrixId')
            : t('operation.notifySigners.deliveryFailed');
        toast.error(t('operation.notifySigners.errorTitle'), { description });
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
        {/* Disabled buttons swallow hover events, so the tooltip anchors to a wrapper. */}
        <div className="shrink-0">
          <Button
            className="whitespace-nowrap"
            pallet="secondary"
            variant="fill"
            size="sm"
            prefixElement={<Icon name="notification" size={16} />}
            disabled={isNotifying || !hasSigned}
            isLoading={isNotifying}
            onClick={handleNotify}
          >
            {t('operation.notifySigners.button')}
          </Button>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        {t(hasSigned ? 'operation.notifySigners.tooltip' : 'operation.notifySigners.tooltipSignFirst')}
      </Tooltip.Content>
    </Tooltip>
  );
};
