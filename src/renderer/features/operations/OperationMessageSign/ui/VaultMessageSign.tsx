import { u8aConcat } from '@polkadot/util';
import { useMemo, useState } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Loader, SmallTitleText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import {
  CameraAccessAlert,
  QrSignatureReader,
  QrTxGenerator,
  SUBSTRATE_ID,
  createMessageSignPayload,
  useCameraAvailability,
} from '@/entities/transaction';
import { type MessageSigningProps } from '../lib/types';

export const VaultMessageSign = ({ payload, signerWallet, onGoBack, onResult }: MessageSigningProps) => {
  const { t } = useI18n();
  const { status: cameraStatus, retry: retryCamera } = useCameraAvailability();
  const [phase, setPhase] = useState<'display' | 'scan'>('display');
  const [cameraId, setCameraId] = useState<string | null>(null);

  const { signatory, message } = payload;
  const address = toAddress(signatory.accountId);
  const chainId = payload.chainId ?? (accountService.isChainAccount(signatory) ? signatory.chainId : undefined);

  const qrPayload = useMemo(() => {
    if (!chainId) return null;

    return u8aConcat(SUBSTRATE_ID, createMessageSignPayload(address, message, chainId, signatory.cryptoType));
  }, [address, message, chainId, signatory.cryptoType]);

  if (!qrPayload) return null;

  if (cameraStatus === 'checking') {
    return (
      <Box width="340px" height="340px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  if (cameraStatus === 'denied' || cameraStatus === 'no_input') {
    return (
      <div className="flex flex-col items-center gap-4">
        <CameraAccessAlert status={cameraStatus} onRetry={retryCamera} />
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </div>
    );
  }

  if (phase === 'display') {
    return (
      <div className="flex flex-col items-center gap-4">
        {signerWallet && (
          <div className="mb-1 flex h-8 items-center gap-x-2">
            <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>
            <WalletIcon type={signerWallet.type} size={16} />
            <FootnoteText className="text-text-secondary">{signerWallet.name}</FootnoteText>
          </div>
        )}

        <SmallTitleText>{t('addressBook.auth.scanQrTitle')}</SmallTitleText>
        <QrTxGenerator payload={qrPayload} size="240px" />

        <div className="flex w-full justify-between">
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
          <Button onClick={() => setPhase('scan')}>{t('signing.continueButton')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <SmallTitleText>{t('addressBook.auth.scanSignatureTitle')}</SmallTitleText>
      <QrSignatureReader
        size={280}
        cameraId={cameraId}
        onCameraList={(cameras) => {
          if (cameras.length > 0 && !cameraId) {
            setCameraId(cameras[0]!.deviceId);
          }
        }}
        onResult={(signature: HexString) => onResult(signature)}
      />

      <div className="flex w-full">
        <Button variant="text" onClick={() => setPhase('display')}>
          {t('operation.goBackButton')}
        </Button>
      </div>
    </div>
  );
};
