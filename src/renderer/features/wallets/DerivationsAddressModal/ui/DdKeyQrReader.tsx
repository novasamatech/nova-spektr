import { hexToU8a, isHex, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, ethereumEncode } from '@polkadot/util-crypto';

import { CryptoType } from '@/shared/core';
import { type DdAddressInfoDecoded, type DdSeedInfo, VaultQrReader } from '@/entities/transaction';

const RESULT_DELAY = 250;

type Props = {
  size?: number | [number, number];
  className?: string;
  onGoBack: () => void;
  onResult: (payload: DdAddressInfoDecoded[]) => void;
};

export const DdKeyQrReader = ({ size = 300, onGoBack, onResult }: Props) => {
  const onScanResult = (qrPayload: DdSeedInfo[]) => {
    const derivations: DdAddressInfoDecoded[] = [];
    for (const qr of qrPayload) {
      if (qr.multiSigner) {
        // Run encodeAddress to check we got valid address for public key
        encodeAddress(qr.multiSigner.public);
      }

      if (qr.dynamicDerivations.length === 0) continue;

      const derivationsAddressInfo = qr.dynamicDerivations.map((addressInfo) => {
        const publicKey = isHex(addressInfo.publicKey.public)
          ? hexToU8a(addressInfo.publicKey.public)
          : decodeAddress(addressInfo.publicKey.public);

        const isEthereum = addressInfo.encryption === CryptoType.ETHEREUM;

        return {
          ...addressInfo,
          publicKey: {
            MultiSigner: addressInfo.publicKey.MultiSigner,
            public: isEthereum ? ethereumEncode(publicKey) : encodeAddress(publicKey),
            publicHex: isEthereum ? u8aToHex(publicKey) : undefined,
          },
        };
      });
      derivations.push(...derivationsAddressInfo);
    }

    setTimeout(() => onResult(derivations), RESULT_DELAY);
  };

  return <VaultQrReader size={size} isDynamicDerivations onResult={onScanResult} onBack={onGoBack} />;
};
