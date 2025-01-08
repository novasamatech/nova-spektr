import { default as QRCodeStyling } from 'qr-code-styling';
import { useEffect, useState } from 'react';

import { Loader } from '@/shared/ui';
import { NWQRConfig, WCQRConfig } from '../lib/constants';

type Props = {
  uri: string;
  type: 'novawallet' | 'walletconnect';
};

export const WalletConnectQrCode = ({ uri, type }: Props) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeStyling>();

  useEffect(() => {
    setQrCode(
      new QRCodeStyling(
        {
          walletconnect: WCQRConfig,
          novawallet: NWQRConfig,
        }[type],
      ),
    );
  }, [type]);

  useEffect(() => {
    if (ref && qrCode) {
      qrCode.append(ref);
    }

    return () => {
      if (ref) {
        QRCodeStyling._clearContainer(ref);
      }
    };
  }, [qrCode, ref]);

  useEffect(() => {
    qrCode?.update({ data: uri });
  }, [uri, qrCode]);

  return (
    <div className="relative flex h-[360px] flex-col items-center justify-center">
      <div className="absolute left-[50%] top-[50%] z-0 -translate-x-1/2 -translate-y-1/2">
        <Loader color="primary" size={24} />
      </div>

      <div key="wallet-connect" className="z-10" ref={setRef} />
    </div>
  );
};
