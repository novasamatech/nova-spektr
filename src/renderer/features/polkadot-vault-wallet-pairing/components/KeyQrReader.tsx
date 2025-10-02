import { hexToU8a, isHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { useState } from 'react';

import { CryptoTypeString } from '@/shared/core';
import { Icon } from '@/shared/ui';
import { type SeedInfo, VaultQrReader } from '@/entities/transaction';

const RESULT_DELAY = 250;

type Props = {
  size?: number | [number, number];
  onComplete(payload: SeedInfo): void;
  onBack(): void;
};

export const KeyQrReader = ({ size = 300, onComplete, onBack }: Props) => {
  const [isScanComplete, setIsScanComplete] = useState(false);

  const onScanResult = (qrPayload: SeedInfo[]) => {
    const qr = qrPayload[0];

    if (qr.multiSigner && qr.multiSigner.MultiSigner !== CryptoTypeString.ECDSA) {
      encodeAddress(qr.multiSigner.public);
    }

    // Validate each derived key, decodeAddress & encodeAddress can throw
    for (const { address } of qr.derivedKeys) {
      const accountId = isHex(address) ? hexToU8a(address) : decodeAddress(address);
      if (accountId.length === 20) continue;
      encodeAddress(accountId);
    }

    setIsScanComplete(true);
    setTimeout(() => onComplete(qr), RESULT_DELAY);
  };

  return (
    <>
      <VaultQrReader size={size} onResult={onScanResult} onBack={onBack} />
      {isScanComplete && (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center">
          <div className="rounded-2lg backdrop-blur-xs after:absolute after:inset-0 after:bg-white/50" />
          <Icon size={100} name="checkmarkCutout" className="text-success" />
        </div>
      )}
    </>
  );
};
