import { useUnit } from 'effector-react';
import { useEffect, useRef } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { PERMISSIONS } from '@/domains/backend';
import { authModel } from '@/aggregates/backend';
import { createDraftModel } from '../model/create-draft-model';

type Props = {
  /** Hex call data of the built transaction. Button is disabled while empty. */
  callData?: string | null;
  /** Chain the transaction targets. Button is disabled while missing. */
  chainId?: ChainId | null;
  /** Optional description pre-fill (e.g. "Transfer 1 DOT to Alice"). */
  description?: string;
  /** Optional mode for the Call data step (paste by default for pre-filled hex). */
  inputMode?: 'paste' | 'build';
  /** Telemetry/debug marker to trace where the draft was initiated from. */
  source: string;
  /**
   * External disable (e.g. form not valid yet). Overrides nothing — combined
   * with internal checks.
   */
  disabled?: boolean;
  /**
   * Fired after the draft has been successfully saved from the flow initiated
   * by this button. Typically used by the initiating modal to close itself so
   * the user isn't left in a stale flow.
   */
  onDraftCreated?: () => void;
};

/**
 * Drop-in secondary action: creates a draft operation from the current flow's
 * transaction. Hidden unless the user is authenticated with
 * operation-draft:write.
 *
 * Pass the ready callData + chainId from the flow's state. The button stays
 * disabled while those aren't available so the placement doesn't jump.
 */
export const InitiateDraftButton = ({
  callData,
  chainId,
  description,
  inputMode = 'paste',
  source,
  disabled,
  onDraftCreated,
}: Props) => {
  const { t } = useI18n();
  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);

  // Tracks whether this button instance started the currently-open draft flow.
  // Only the initiator should fire onDraftCreated — prevents unrelated draft
  // saves (from another flow) from closing this modal.
  const initiatedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    const unsubCreated = createDraftModel.draftCreated.watch(() => {
      if (initiatedRef.current) {
        initiatedRef.current = false;
        onDraftCreated?.();
      }
    });
    // eslint-disable-next-line effector/no-watch
    const unsubClosed = createDraftModel.modalClosed.watch(() => {
      initiatedRef.current = false;
    });

    return () => {
      unsubCreated();
      unsubClosed();
    };
  }, [onDraftCreated]);

  const canWrite = isAuthenticated && (authState?.permissions.includes(PERMISSIONS.OPERATION_DRAFT_WRITE) ?? false);

  // Not connected to address book or no write perm — hide entirely to keep the footer clean.
  if (!canWrite) return null;

  const ready = !!callData && !!chainId;
  const isDisabled = disabled || !ready;

  const handleClick = () => {
    if (!ready) return;
    initiatedRef.current = true;
    createDraftModel.createDraftRequested({
      callData: callData ?? undefined,
      chainId: chainId ?? undefined,
      description,
      inputMode,
      source,
    });
  };

  const button = (
    <Button pallet="secondary" disabled={isDisabled} onClick={handleClick}>
      {t('operations.drafts.initiateButton')}
    </Button>
  );

  if (!isDisabled) return button;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div>{button}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>{t('operations.drafts.initiateDisabledTooltip')}</Tooltip.Content>
    </Tooltip>
  );
};
