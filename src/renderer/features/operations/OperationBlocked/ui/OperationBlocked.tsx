import { useNavigate } from 'react-router-dom';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { type OperationBlockReason, type OperationBlockReasonKind } from '@/shared/transactions';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';

type Props = {
  reason: OperationBlockReason;
  chain: Chain | null;
  onRetry: () => void;
  onClose: () => void;
};

type ActionKind = 'retry' | 'enableNetwork' | 'changeNode' | 'reload' | 'close' | 'cancel';

type Copy = {
  title: string;
  description: string;
  /** First entry is rendered as the primary button. */
  actions: ActionKind[];
};

export const OperationBlocked = ({ reason, chain, onRetry, onClose }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const chainName = chain?.name ?? '';

  // A Record keyed by the reason kind, NOT a switch. Exhaustiveness here does not
  // depend on an explicit return-type annotation: omit a kind and the compiler
  // fails with TS2741 (missing property). A switch inside a component with an
  // inferred return type silently widens to `Copy | undefined` instead.
  const copyByReason: Record<OperationBlockReasonKind, Copy> = {
    'network-disabled': {
      title: t('operations.blocked.networkDisabledTitle', { chain: chainName }),
      description: t('operations.blocked.networkDisabledDescription', { chain: chainName }),
      actions: ['enableNetwork', 'cancel'],
    },
    'network-unreachable': {
      title: t('operations.blocked.networkUnreachableTitle', { chain: chainName }),
      description: t('operations.blocked.networkUnreachableDescription', { chain: chainName }),
      actions: ['retry', 'changeNode'],
    },
    'node-rate-limited': {
      title: t('operations.blocked.rateLimitedTitle'),
      description: t('operations.blocked.rateLimitedDescription', { chain: chainName }),
      actions: ['changeNode', 'retry'],
    },
    'fee-unavailable': {
      title: t('operations.blocked.feeUnavailableTitle'),
      description: t('operations.blocked.feeUnavailableDescription'),
      actions: ['retry', 'changeNode'],
    },
    'no-signatory': {
      title: t('operations.blocked.noSignatoryTitle'),
      description: t('operations.blocked.noSignatoryDescription'),
      actions: ['close'],
    },
    'signing-path-unresolved': {
      title: t('operations.blocked.signingPathUnresolvedTitle'),
      description: t('operations.blocked.signingPathUnresolvedDescription'),
      actions: ['close'],
    },
    'invalid-call-data': {
      title: t('operations.blocked.invalidCallDataTitle'),
      description: t('operations.blocked.invalidCallDataDescription', { chain: chainName }),
      actions: ['close'],
    },
    internal: {
      title: t('operations.blocked.internalTitle'),
      description: t('operations.blocked.internalDescription'),
      actions: ['reload', 'close'],
    },
  };

  const copy = copyByReason[reason.kind];

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
        return navigate(Paths.NETWORK);
      case 'reload':
        return window.location.reload();
      case 'close':
      case 'cancel':
        return onClose();
    }
  };

  const label: Record<ActionKind, string> = {
    retry: t('operations.blocked.retry'),
    enableNetwork: t('operations.blocked.enableNetwork'),
    changeNode: t('operations.blocked.changeNode'),
    reload: t('operations.blocked.reload'),
    close: t('operations.blocked.close'),
    cancel: t('operations.blocked.cancel'),
  };

  return (
    <Box width="440px" verticalAlign="center" horizontalAlign="center" gap={4} padding={[10, 5]}>
      <Icon className="text-icon-warning" name="warnCutout" size={60} />
      <SmallTitleText align="center">{copy.title}</SmallTitleText>
      <FootnoteText className="text-center text-text-tertiary">{copy.description}</FootnoteText>

      <div className="mt-2 flex gap-2">
        {copy.actions.map((action, index) => (
          <Button key={action} size="sm" variant={index === 0 ? 'fill' : 'text'} onClick={() => runAction(action)}>
            {label[action]}
          </Button>
        ))}
      </div>
    </Box>
  );
};
