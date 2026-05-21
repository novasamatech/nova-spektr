import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Asset, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { type PathNextOption, type PathSource } from '../model/graph-model';
import { pathModel } from '../model/path-model';

import { StepPath } from './StepPath';

type Props = {
  isOpen: boolean;
  chainId: ChainId;
  initialPath: PathNode[];
  /**
   * Open the modal at the picker for this hop. 0 + editableInitiator opens the
   * source picker.
   */
  editFromIndex?: number;
  /** Allow editing the source. Off for wallet-bound forms. */
  editableInitiator?: boolean;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  /** When set, signer rows show the candidate's transferable balance. */
  getOptionBalance?: (option: PathNextOption) => BN | string | null;
  optionAsset?: Asset;
  /**
   * Override the source list used inside the modal. Draft mode passes the
   * address-book-restricted set; regular flows let the modal derive its own via
   * `restrictToOwnAccounts`.
   */
  sources?: PathSource[];
  /** Hop-level filter applied to the next-options shown in the picker. */
  filterNextOption?: (option: PathNextOption) => boolean;
  /**
   * Restrict next-options to own-wallet candidates. Defaults to true so the
   * regular flow keeps its existing behavior; draft mode passes false so the
   * address-book filter governs which hops are reachable.
   */
  restrictToOwnAccounts?: boolean;
  onSave: (path: PathNode[]) => void;
  onClose: () => void;
};

export const SigningPathEditModal = ({
  isOpen,
  chainId,
  initialPath,
  editFromIndex,
  editableInitiator = false,
  allowedProxyTypes,
  disabledProxyReason,
  getOptionBalance,
  optionAsset,
  sources,
  filterNextOption,
  restrictToOwnAccounts = true,
  onSave,
  onClose,
}: Props) => {
  const { t } = useI18n();
  const isComplete = useUnit(pathModel.$isComplete);
  const livePath = useUnit(pathModel.$path);

  // pathModel is a shared singleton; reset on close so other consumers
  // (drafts, flexible-multisig) don't see leftover state.
  useEffect(() => {
    if (!isOpen) return;
    pathModel.pathReset();
    const editingInitiator = editableInitiator && editFromIndex === 0;
    if (initialPath.length > 0 && !editingInitiator) {
      pathModel.pathSeeded(initialPath);
      if (editFromIndex !== undefined && editFromIndex > 0 && editFromIndex < initialPath.length) {
        pathModel.pathTruncatedTo(editFromIndex - 1);
      }
    }

    return () => {
      pathModel.pathReset();
    };
  }, [isOpen, initialPath, editFromIndex, editableInitiator]);

  const handleToggle = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSave = () => {
    onSave(livePath);
  };

  return (
    <Modal isOpen={isOpen} size="mdlg" height="fit" onToggle={handleToggle}>
      <Modal.Title close>{t('signingPath.control.editTitle')}</Modal.Title>
      <Modal.Content>
        <div className="flex h-full flex-col gap-y-4 px-5 pt-4 pb-6">
          <StepPath
            chainId={chainId}
            lockedSourceCount={editableInitiator ? 0 : 1}
            restrictToOwnAccounts={restrictToOwnAccounts}
            sources={sources}
            filterNextOption={filterNextOption}
            allowedProxyTypes={allowedProxyTypes}
            disabledProxyReason={disabledProxyReason}
            getOptionBalance={getOptionBalance}
            optionAsset={optionAsset}
            className="min-h-[320px]"
          />
        </div>
      </Modal.Content>
      <Modal.Footer align="between">
        <Button variant="text" onClick={onClose}>
          {t('signingPath.control.cancel')}
        </Button>
        <Button disabled={!isComplete} onClick={handleSave}>
          {t('signingPath.control.save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
