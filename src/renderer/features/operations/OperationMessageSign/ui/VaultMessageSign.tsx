import { u8aConcat } from '@polkadot/util';
import { useMemo, useState } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, SmallTitleText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { accountService } from '@/domains/network';
import { QrSignatureReader, QrTxGenerator, SUBSTRATE_ID, createMessageSignPayload } from '@/entities/transaction';
import { type MessageSigningProps } from '../lib/types';

export const VaultMessageSign = ({ payload, signerWallet, onGoBack, onResult }: MessageSigningProps) => {
  const { t } = useI18n();
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

  if (phase === 'display') {
    return (
      <div className="flex flex-col items-center gap-4">
        {signerWallet && (
          <div className="mb-1 flex h-8 w-full items-center justify-center">
            <div className="flex h-full items-center justify-center gap-x-0.5">
              <FootnoteText className="whitespace-nowrap text-text-secondary">{t('signing.signer')}</FootnoteText>

              <div className="flex w-full items-center gap-x-2 px-2">
                <WalletIcon type={signerWallet.type} size={16} />
                <FootnoteText className="w-max text-text-secondary">{signerWallet.name}</FootnoteText>
              </div>
            </div>
          </div>
        )}

        <SmallTitleText>{t('addressBook.auth.scanQrTitle')}</SmallTitleText>
        <QrTxGenerator payload={qrPayload} size="240px" />

        <Button onClick={() => setPhase('scan')}>{t('signing.continueButton')}</Button>

        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
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

      <Button variant="text" onClick={() => setPhase('display')}>
        {t('operation.goBackButton')}
      </Button>
    </div>
  );
};
