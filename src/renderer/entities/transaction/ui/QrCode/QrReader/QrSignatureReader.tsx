import { hexToU8a, u8aToHex } from '@polkadot/util';
import { type Result } from '@zxing/library';
import init from 'raptorq/raptorq';
import { useRef } from 'react';

import { type HexString } from '@/shared/core';
import { type QrReaderCamera, QR_READER_ERRORS, QrReader, QrReaderErrorCode } from '@/shared/ui-kit';
import { type ErrorObject } from '../common/types';

import { isQrErrorObject } from './scannerUtils';

type Props = {
  size?: [number, number] | number;
  cameraId: string | null;
  onResult(scanResult: HexString): void;
  onError?(error: ErrorObject): void;
  onCameraList(cameras: QrReaderCamera[]): void;
};

export const QrSignatureReader = ({ size = 300, cameraId, onCameraList, onResult, onError }: Props) => {
  const isComplete = useRef(false);

  const decodeFrame = async (result: Result): Promise<void> => {
    if (isComplete.current) return;

    try {
      await init();
      const qr = result.getText();
      const signature = u8aToHex(hexToU8a(qr));
      isComplete.current = true;
      onResult?.(signature);
    } catch (error) {
      if (!isQrErrorObject(error)) {
        onError?.(QR_READER_ERRORS[QrReaderErrorCode.DECODE_ERROR]);
      } else {
        onError?.(error as ErrorObject);
      }
    }
  };

  return (
    <QrReader size={size} cameraId={cameraId} onCameraList={onCameraList} onResult={decodeFrame} onError={onError} />
  );
};
