import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { validatorSelectionModel } from '../model/validator-selection-model';

const { events } = validatorSelectionModel;

type Props = {
  onGoBack?: () => void;
};

export const SelectionFooter = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const { signingMode, canSubmit, viewNote } = useUnit({
    signingMode: validatorSelectionModel.$signingMode,
    canSubmit: validatorSelectionModel.$canSubmit,
    viewNote: validatorSelectionModel.$viewNote,
  });

  const selectionNote = nullable(viewNote.estimatedApy)
    ? t('staking.validatorSelection.footer.viewNoteNoApy', {
        shown: viewNote.selectedShown,
        selected: viewNote.selected,
      })
    : t('staking.validatorSelection.footer.viewNote', {
        shown: viewNote.selectedShown,
        selected: viewNote.selected,
        apy: viewNote.estimatedApy.toFixed(1),
      });

  return (
    <Modal.Footer align="between">
      <div className="flex min-w-0 items-center gap-x-3">
        {onGoBack ? (
          <Button variant="text" size="sm" onClick={onGoBack}>
            {t('staking.validatorSelection.footer.back')}
          </Button>
        ) : null}
        <ContextNote />
      </div>

      <div className="flex shrink-0 items-center gap-x-3">
        <FootnoteText className="text-text-tertiary">{selectionNote}</FootnoteText>
        {signingMode === 'watchOnly' ? null : (
          <Button disabled={!canSubmit} onClick={() => events.validatorsSubmitted()}>
            {signingMode === 'draft'
              ? t('staking.validatorSelection.footer.saveAsDraft')
              : t('staking.validatorSelection.footer.continue')}
          </Button>
        )}
      </div>
    </Modal.Footer>
  );
};

/**
 * The left half answers a different question in every signing mode: how much of
 * the list is on screen when the user signs themselves, who will sign when they
 * cannot, and why nothing can be signed at all.
 */
const ContextNote = () => {
  const { t } = useI18n();

  const { signingMode, signingInfo, showingNote, pending, failed } = useUnit({
    signingMode: validatorSelectionModel.$signingMode,
    signingInfo: validatorSelectionModel.$signingInfo,
    showingNote: validatorSelectionModel.$showingNote,
    pending: validatorSelectionModel.$pending,
    failed: validatorSelectionModel.$failed,
  });

  if (signingMode === 'watchOnly') {
    return (
      <FootnoteText className="text-text-tertiary">{t('staking.validatorSelection.footer.watchOnly')}</FootnoteText>
    );
  }

  if (signingMode === 'draft' && nonNullable(signingInfo) && nonNullable(signingInfo.signerName)) {
    const signerLine = nonNullable(signingInfo.multisigLabel)
      ? t('staking.validatorSelection.footer.signingAsMultisig', {
          name: signingInfo.signerName,
          multisig: signingInfo.multisigLabel,
        })
      : t('staking.validatorSelection.footer.signingAs', { name: signingInfo.signerName });

    return (
      <div className="flex min-w-0 flex-col">
        <FootnoteText className="truncate">{signerLine}</FootnoteText>
        {nonNullable(signingInfo.signatoriesCount) ? (
          <FootnoteText className="text-text-tertiary">
            {t('staking.validatorSelection.footer.draftRecipients', { count: signingInfo.signatoriesCount })}
          </FootnoteText>
        ) : null}
      </div>
    );
  }

  // "Showing 0 of 0" reads as an empty list, not as one that is on its way.
  // With nothing fetched *and* the request given up, the wait is over: the
  // table says so and offers the retry, and a footer still promising the list
  // is coming would contradict it.
  if (pending) {
    if (failed) return null;

    return <FootnoteText className="text-text-tertiary">{t('staking.validatorSelection.loading.meta')}</FootnoteText>;
  }

  return (
    <FootnoteText className="text-text-tertiary">
      {t('staking.validatorSelection.footer.showing', { shown: showingNote.shown, total: showingNote.total })}
    </FootnoteText>
  );
};
