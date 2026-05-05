import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { pathModel } from '../model/path-model';

import { StepPath } from './StepPath';

type Props = {
  isOpen: boolean;
  chainId: ChainId;
  initialPath: PathNode[];
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  onSave: (path: PathNode[]) => void;
  onClose: () => void;
};

export const SigningPathEditModal = ({
  isOpen,
  chainId,
  initialPath,
  allowedProxyTypes,
  disabledProxyReason,
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
    }

    return () => {
      pathModel.pathReset();
    };
  }, [isOpen, initialPath]);

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
          />
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={onClose}>
            {t('signingPath.control.cancel')}
          </Button>
          <Button disabled={!isComplete} onClick={handleSave}>
            {t('signingPath.control.save')}
          </Button>
        </Box>
      </Modal.Footer>
    </Modal>
  );
};
