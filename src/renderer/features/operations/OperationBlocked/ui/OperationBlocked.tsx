import { useNavigate } from 'react-router-dom';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { type OperationBlockReason } from '@/shared/transactions';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { StatusPanel } from '@/shared/ui-kit';
import { type ActionKind, ACTION_LABEL_KEYS, REASON_COPY_KEYS } from '../lib/copyKeys';

type Props = {
  /** Why the operation cannot proceed; picks the copy and the offered actions. */
  reason: OperationBlockReason;
  /**
   * Chain the operation targets, interpolated into the copy; `null` falls back
   * to a generic name.
   */
  chain: Chain | null;
  /** Re-runs the failed preparation step. */
  onRetry: () => void;
  /**
   * Ends the flow: closes the modal and releases whatever the flow armed on
   * entry.
   */
  onClose: () => void;
};

/**
 * Terminal "operation blocked" screen rendered in place of the "Preparing
 * signing data…" spinner once preparation fails with a reason that cannot be
 * waited out. Title, description and the action buttons all come from
 * `REASON_COPY_KEYS`; the first action is the primary button.
 */
export const OperationBlocked = ({ reason, chain, onRetry, onClose }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const chainName = chain?.name ?? t('operations.blocked.genericChain');
  const copyKeys = REASON_COPY_KEYS[reason.kind];

  const runAction = (action: ActionKind) => {
    switch (action) {
      case 'retry':
        return onRetry();
      case 'enableNetwork':
      case 'changeNode':
        // Both routes land on network settings: enabling a disabled chain needs a
        // connection type pick (auto-balance / light client / RPC node) via
        // storageService.connections, there is no single "just enable it" event
        // (networkModel.events.chainConnected filters out disabled connections and
        // is a no-op for them). Sending the user to the settings page is correct
        // for both remediations.
        //
        // End the flow first. Navigating unmounts the page that hosts this modal but
        // says nothing to the model behind it: the flow would stay open forever with
        // its readiness timers armed and its auto-retry still firing at a node nobody
        // is waiting on, and any global flag the flow set on entry (e.g. the drafts
        // flow's `setDraftFlowActive`) would leak into every later operation.
        onClose();

        return navigate(Paths.NETWORK);
      case 'reload':
        return window.location.reload();
      case 'close':
      case 'cancel':
        return onClose();
    }
  };

  return (
    // role="alert" announces the failure to screen-reader users who otherwise get no
    // signal that the wait ended. Box doesn't forward arbitrary HTML attributes, so
    // the role lives on a plain wrapper div.
    <div role="alert">
      <StatusPanel tone="warning">
        <SmallTitleText align="center">{t(copyKeys.titleKey, { chain: chainName })}</SmallTitleText>
        <FootnoteText className="text-center text-text-tertiary">
          {t(copyKeys.descriptionKey, { chain: chainName })}
        </FootnoteText>

        <div className="mt-2 flex gap-2">
          {copyKeys.actions.map((action, index) => (
            <Button key={action} size="sm" variant={index === 0 ? 'fill' : 'text'} onClick={() => runAction(action)}>
              {t(ACTION_LABEL_KEYS[action])}
            </Button>
          ))}
        </div>
      </StatusPanel>
    </div>
  );
};
