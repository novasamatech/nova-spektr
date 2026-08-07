import { encodeAddress } from '@polkadot/util-crypto';
import { useStoreMap, useUnit } from 'effector-react';
import { type PropsWithChildren, useMemo, useState } from 'react';

import { type Address, type PolkadotVaultWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, SmallTitleText } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { OperationResult, QrTxGenerator, createDynamicDerivationExportPayload } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletDetailsUtils } from '@/features/wallet-details';
import { exportKeysUtils } from '../lib/export-keys-utils';

type Props = PropsWithChildren<{
  wallet: PolkadotVaultWallet;
  onClose?: () => void;
}>;

export const ExportKeysModal = ({ wallet, onClose, children }: Props) => {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [isDownloadModalOpen, setDownloadModalOpen] = useState(false);
  const chains = useUnit(networkModel.$chains);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsOpen(true);
      return;
    }
    handleClose();
  };

  // Read from the live account list rather than the deprecated wallet.accounts,
  // which is a snapshot taken when the wallet details modal was opened.
  const walletAccounts = useStoreMap({
    store: accounts.$list,
    keys: [wallet.id],
    fn: (allAccounts, [walletId]) =>
      accountService.filterAccountsByWallet(allAccounts, walletId).filter(accountUtils.isVaultDerivedAccount),
    // `fn` allocates a new array every run, so without this any unrelated change to
    // accounts.$list would re-encode the QR payload.
    updateFilter: (next, prev) => next.length !== prev.length || next.some((a, index) => a !== prev[index]),
  });

  const exportAccounts = useMemo(() => {
    const accountsMap = walletDetailsUtils.getVaultAccountsMap(walletAccounts);
    //todo sort these accounts

    return Object.values(accountsMap).flat().filter(nonNullable);
  }, [walletAccounts]);

  const downloadKeysFile = () => {
    exportKeysUtils.exportVaultWallet(wallet, wallet.rootAccountId, exportAccounts);
    setDownloadModalOpen(true);
  };

  const qrPayload = useMemo(() => {
    const address = encodeAddress(wallet.rootAccountId) as Address;
    return createDynamicDerivationExportPayload(wallet.name, address, exportAccounts.flat(), chains);
  }, [wallet.name, wallet.rootAccountId, exportAccounts, chains]);

  return (
    <Modal size="md" height="fit" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('dynamicDerivations.exportKeys.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box direction="column" gap={6} padding={3} horizontalAlign="center">
          <SmallTitleText>{t('dynamicDerivations.exportKeys.qrCodeTitle')}</SmallTitleText>
          <QrTxGenerator payload={qrPayload} enableRaptorQ />
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
