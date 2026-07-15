import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { resolveDescriptionAreaState } from '@/shared/lib/operation-description/resolveDescriptionAreaState';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation, MultisigOperationStatus } from '@/domains/network';
import { useDescriptionEditing } from '../lib/use-description-editing';

import { DescriptionEditorModal } from './DescriptionEditorModal';
import { DescriptionNotInBookMessage } from './DescriptionNotInBookMessage';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

const HOVER_REVEAL_CLASS = cnTw(
  'inline-flex items-center gap-1 text-footnote font-medium opacity-0 transition-opacity',
  'group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus:opacity-100',
);

export const OperationDescriptionCell = ({ operation, chain }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const { hasWritePermission, isInAddressBook, isHealthy, hasEverConnected } = useDescriptionEditing(operation);

  if (description) {
    return (
      <div className="min-w-0 truncate" title={description}>
        <FootnoteText className="truncate text-text-secondary">{description}</FootnoteText>
      </div>
    );
  }

  if (operation.status !== MultisigOperationStatus.Pending) return null;

  const state = resolveDescriptionAreaState({
    isMultisig: true,
    isDraftActive: false,
    hasWritePermission,
    isHealthy,
    isInAddressBook,
    hasEverConnected,
  });

  // The row cell carries no reconnect UI — the Details panel has it.
  if (state === 'hidden' || state === 'reconnect') return null;

  if (state === 'error') {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <span className={cnTw(HOVER_REVEAL_CLASS, 'cursor-not-allowed text-text-tertiary')}>
            <Icon name="lock" size={13} />
            {t('operation.addDescriptionButton')}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <DescriptionNotInBookMessage operation={operation} chain={chain} />
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return (
    <DescriptionEditorModal
      operation={operation}
      trigger={
        <button
          type="button"
          className={cnTw(HOVER_REVEAL_CLASS, 'text-icon-accent')}
          onClick={e => e.stopPropagation()}
        >
          <Icon name="add" size={13} />
          {t('operation.addDescriptionButton')}
        </button>
      }
    />
  );
};
