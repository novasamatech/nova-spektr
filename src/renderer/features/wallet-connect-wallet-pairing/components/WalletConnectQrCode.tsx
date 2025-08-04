import { default as QRCodeStyling } from 'qr-code-styling';
import { useEffect, useState } from 'react';

import { Loader } from '@/shared/ui';
import { NWQRConfig, WCQRConfig } from '../lib/constants';

type Props = {
  uri: string;
  type: 'novawallet' | 'walletconnect';
  size?: number;
};

export const WalletConnectQrCode = ({ uri, type, size = 300 }: Props) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeStyling>();

  useEffect(() => {
    setQrCode(
      new QRCodeStyling(
        {
          walletconnect: { ...WCQRConfig, width: size, height: size },
          novawallet: { ...NWQRConfig, width: size, height: size },
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
    <div className="relative flex flex-col items-center justify-center" style={{ height: size }}>
      <div className="absolute top-[50%] left-[50%] z-0 -translate-x-1/2 -translate-y-1/2">
        <Loader color="primary" size={24} />
      </div>

      <div key="wallet-connect" className="z-10" ref={setRef} />
    </div>
  );
};
