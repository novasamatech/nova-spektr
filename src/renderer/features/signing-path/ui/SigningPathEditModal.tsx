import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type Asset, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { type PathNextOption } from '../model/graph-model';
import { pathModel } from '../model/path-model';

import { StepPath } from './StepPath';

type Props = {
  isOpen: boolean;
  chainId: ChainId;
  initialPath: PathNode[];
  /**
   * When set, the modal opens with the path truncated to before this index so
   * the user lands on the picker for that exact hop. Out-of-range values (≤ 0
   * or ≥ path.length) leave the full path seeded.
   */
  editFromIndex?: number;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  /**
   * Forwarded to StepPath. When provided, signer candidate rows display the
   * option's transferable balance to help the user pick a viable initiator.
   */
  getOptionBalance?: (option: PathNextOption) => BN | string | null;
  optionAsset?: Asset;
  onSave: (path: PathNode[]) => void;
  onClose: () => void;
};

export const SigningPathEditModal = ({
  isOpen,
  chainId,
  initialPath,
  editFromIndex,
  allowedProxyTypes,
  disabledProxyReason,
  getOptionBalance,
  optionAsset,
  onSave,
  onClose,
}: Props) => {
  const { t } = useI18n();
  const isComplete = useUnit(pathModel.$isComplete);
  const livePath = useUnit(pathModel.$path);

  // Borrow the singleton pathModel as a scratchpad while the modal is open:
  // seed from incoming committed path on open, clear on close so we don't
  // leak state into other consumers (drafts, flexible-multisig).
  useEffect(() => {
    if (!isOpen) return;
    pathModel.pathReset();
    if (initialPath.length > 0) {
      pathModel.pathSeeded(initialPath);
      if (editFromIndex !== undefined && editFromIndex > 0 && editFromIndex < initialPath.length) {
        pathModel.pathTruncatedTo(editFromIndex - 1);
      }
    }

    return () => {
      pathModel.pathReset();
    };
  }, [isOpen, initialPath, editFromIndex]);

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
            lockedSourceCount={1}
            restrictToOwnAccounts
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
