import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type PolkadotVaultWallet, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button, SmallTitleText } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { OperationResult, QrDerivationsExportGenerator } from '@/entities/transaction';
import { exportKeysUtils } from '../lib/export-keys-utils';

type Props = {
  isOpen: boolean;
  wallet: PolkadotVaultWallet;
  accounts: (VaultChainAccount | VaultShardAccount[])[];
  onClose: () => void;
};

export const ExportKeysModal = ({ isOpen, wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();
  const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
  const chains = useUnit(networkModel.$chains);

  const downloadKeysFile = () => {
    exportKeysUtils.exportVaultWallet(wallet, wallet.rootAccountId, accounts, chains);
    setDownloadModalOpen(true);
  };

  return (
    <Modal isOpen={isOpen} size="md" height="fit" onToggle={onClose}>
      <Modal.Title close>{t('dynamicDerivations.exportKeys.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box direction="column" gap={6} horizontalAlign="center">
          <SmallTitleText>{t('dynamicDerivations.exportKeys.qrCodeTitle')}</SmallTitleText>
          <QrDerivationsExportGenerator
            walletName={wallet.name}
            rootAccountId={wallet.rootAccountId}
            derivations={accounts.flat()}
            size={240}
          />
          <Button variant="fill" pallet="primary" onClick={downloadKeysFile}>
            {t('dynamicDerivations.exportKeys.downloadButton')}
          </Button>
        </Box>
      </Modal.Content>
      <OperationResult
        isOpen={isDownloadModalOpen}
        variant="success"
        title={t('dynamicDerivations.exportKeys.downloadSuccessPopup')}
        autoCloseTimeout={2000}
        onClose={() => setDownloadModalOpen(false)}
      />
    </Modal>
  );
};
