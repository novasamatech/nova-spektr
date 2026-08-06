import { useNavigate } from 'react-router-dom';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { type OperationBlockReason } from '@/shared/transactions';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type ActionKind, ACTION_LABEL_KEYS, REASON_COPY_KEYS } from '../lib/copyKeys';

type Props = {
  reason: OperationBlockReason;
  chain: Chain | null;
  onRetry: () => void;
  onClose: () => void;
};

export const OperationBlocked = ({ reason, chain, onRetry, onClose }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const chainName = chain?.name ?? t('operations.blocked.genericChain');

  const copyKeys = REASON_COPY_KEYS[reason.kind];
  const copy = {
    title: t(copyKeys.titleKey, { chain: chainName }),
    description: t(copyKeys.descriptionKey, { chain: chainName }),
    actions: copyKeys.actions,
  };

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
    retry: t(ACTION_LABEL_KEYS.retry),
    enableNetwork: t(ACTION_LABEL_KEYS.enableNetwork),
    changeNode: t(ACTION_LABEL_KEYS.changeNode),
    reload: t(ACTION_LABEL_KEYS.reload),
    close: t(ACTION_LABEL_KEYS.close),
    cancel: t(ACTION_LABEL_KEYS.cancel),
  };

  return (
    // This markup replaces the "Preparing signing data…" spinner in place; role="alert"
    // announces the failure to screen-reader users who otherwise get no signal that the
    // wait ended. Box doesn't forward arbitrary HTML attributes, so the role lives on a
    // plain wrapper div.
    <div role="alert">
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
    </div>
  );
};
