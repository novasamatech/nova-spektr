import { Trans } from 'react-i18next';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation, MultisigOperationStatus } from '@/domains/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { useDescriptionEditing } from '../lib/use-description-editing';

import { DescriptionEditorModal } from './DescriptionEditorModal';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

const HOVER_LINK_CLASS = 'hidden items-center gap-1 text-footnote font-medium group-hover/row:inline-flex';

export const OperationDescriptionCell = ({ operation, chain }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const { canEdit } = useDescriptionEditing(operation);

  if (description) {
    return (
      <div className="min-w-0 truncate" title={description}>
        <FootnoteText className="truncate text-text-secondary">{description}</FootnoteText>
      </div>
    );
  }

  if (operation.status !== MultisigOperationStatus.Pending) return null;

  if (!canEdit) {
    return (
      <Tooltip>
        <Tooltip.Trigger>
          <span className={cnTw(HOVER_LINK_CLASS, 'cursor-not-allowed text-text-tertiary')}>
            <Icon name="lock" size={13} />
            {t('operation.addDescriptionButton')}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans
            t={t}
            i18nKey="operation.descriptionMultisigNotInBook"
            components={{
              account: (
                <NamedAccount accountId={operation.multisigAccountId} chain={chain} variant="short" hideExplorers />
              ),
            }}
          />
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return (
    <DescriptionEditorModal
      operation={operation}
      trigger={
        <button type="button" className={cnTw(HOVER_LINK_CLASS, 'text-icon-accent')} onClick={e => e.stopPropagation()}>
          <Icon name="add" size={13} />
          {t('operation.addDescriptionButton')}
        </button>
      }
    />
  );
};
