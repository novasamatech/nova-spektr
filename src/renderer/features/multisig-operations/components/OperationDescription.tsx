import { type ReactNode, useState } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { resolveDescriptionAreaState } from '@/shared/lib/operation-description/resolveDescriptionAreaState';
import { Button, FootnoteText } from '@/shared/ui';
import { useOperationDescription } from '@/domains/backend';
import { type MultisigOperation } from '@/domains/network';
import { ReconnectAddressBookButton } from '@/features/contacts';
import { useDescriptionEditing } from '../lib/use-description-editing';

import { DescriptionEditorModal } from './DescriptionEditorModal';
import { DescriptionNotInBookMessage } from './DescriptionNotInBookMessage';

type Props = {
  operation: MultisigOperation;
  chain: Chain | undefined;
};

/** Past this length the text is cut at a word boundary behind "Show more". */
const DESCRIPTION_COLLAPSE_LENGTH = 620;

/**
 * Keep the word-boundary trim only when it preserves most of the budget (a long
 * hash/URL at the cut would otherwise blank the text).
 */
const COLLAPSE_TRIM_FLOOR = DESCRIPTION_COLLAPSE_LENGTH * 0.8;

const collapseDescription = (description: string) => {
  const raw = description.slice(0, DESCRIPTION_COLLAPSE_LENGTH);
  const trimmed = raw.replace(/\s+\S*$/, '');

  return `${trimmed.length > COLLAPSE_TRIM_FLOOR ? trimmed : raw}…`;
};

type BlockProps = {
  action?: ReactNode;
  children: ReactNode;
};

/** Label row + content underneath, separated from the rows above by a hairline. */
const DescriptionBlock = ({ action, children }: BlockProps) => {
  const { t } = useI18n();

  return (
    <div className="mt-0.5 flex flex-col gap-y-1.5 border-t border-divider pt-3">
      <div className="flex items-center gap-x-2">
        <FootnoteText className="text-text-tertiary">{t('operation.descriptionLabel')}</FootnoteText>
        <span className="flex-1" />
        {action}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-y-1">{children}</div>
    </div>
  );
};

export const OperationDescription = ({ operation, chain }: Props) => {
  const { t } = useI18n();
  const description = useOperationDescription(operation.id);
  const { canEdit, hasWritePermission, isInAddressBook, isHealthy, hasEverConnected } =
    useDescriptionEditing(operation);
  const [isExpanded, setIsExpanded] = useState(false);

  if (description) {
    const isLong = description.length > DESCRIPTION_COLLAPSE_LENGTH;
    const shown = isLong && !isExpanded ? collapseDescription(description) : description;

    return (
      <DescriptionBlock
        action={
          canEdit && (
            <DescriptionEditorModal
              operation={operation}
              trigger={
                <Button size="sm" variant="text" className="shrink-0 p-0">
                  {t('operation.editDescriptionButton')}
                </Button>
              }
            />
          )
        }
      >
        <FootnoteText className="break-words whitespace-pre-wrap text-text-primary">{shown}</FootnoteText>
        {isLong && (
          <Button
            size="sm"
            variant="text"
            className="p-0"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(expanded => !expanded)}
          >
            {isExpanded ? t('operation.showLessButton') : t('operation.showMoreButton')}
          </Button>
        )}
      </DescriptionBlock>
    );
  }

  const state = resolveDescriptionAreaState({
    isMultisig: true,
    isDraftActive: false,
    hasWritePermission,
    isHealthy,
    isInAddressBook,
    hasEverConnected,
  });

  if (state === 'hidden') return null;

  if (state === 'error') {
    return (
      <DescriptionBlock>
        <div className="flex w-full flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-alert-border-negative bg-alert-background-negative p-3 text-footnote text-text-primary">
          <DescriptionNotInBookMessage operation={operation} chain={chain} />
        </div>
      </DescriptionBlock>
    );
  }

  if (state === 'reconnect') {
    return (
      <DescriptionBlock>
        <ReconnectAddressBookButton
          size="sm"
          variant="text"
          iconSize={14}
          label={t('addressBook.auth.reconnectButton')}
          className="shrink-0 gap-x-1 p-0"
        />
      </DescriptionBlock>
    );
  }

  return (
    <DescriptionBlock>
      <DescriptionEditorModal
        operation={operation}
        trigger={
          <Button size="sm" variant="text" className="p-0">
            {t('operation.addDescriptionButton')}
          </Button>
        }
      />
    </DescriptionBlock>
  );
};
