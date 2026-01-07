import { u8aToHex } from '@polkadot/util';
import { type Result } from '@zxing/library';
import init, { Decoder, EncodingPacket } from 'raptorq/raptorq';
import { useRef } from 'react';

import { type HexString } from '@/shared/core';
import { QR_READER_ERRORS, QrReader, type QrReaderCamera, QrReaderErrorCode } from '@/shared/ui-kit';
import { cryptoTypeToMultisignerIndex } from '../QrGenerator/common/utils';
import { FRAME_KEY, SIGNED_TRANSACTION_BULK } from '../common/constants';
import { QR_READER_DECODE_ERRORS } from '../common/errors';
import { DecodeQrError, type ErrorObject, type Progress } from '../common/types';

import { RaptorFrame } from './RaptorFrame';
import { Status, isQrErrorObject } from './scannerUtils';

const makeResultPayload = (payload?: ReturnType<typeof SIGNED_TRANSACTION_BULK.decode>['payload']) => {
  return (payload || []).map((item) =>
    u8aToHex(new Uint8Array([cryptoTypeToMultisignerIndex(item.MultiSignature), ...item.signature])),
  );
};

const createFrame = (metadata?: Uint8Array[]): RaptorFrame => {
  if (!metadata) {
    throw QR_READER_DECODE_ERRORS[DecodeQrError.FRAME_METADATA];
  }

  return new RaptorFrame(metadata[0]!);
};

type Props = {
  size?: number | [number, number];
  cameraId: string | null;
  onResult(scanResult: HexString[]): void;
  onError?(error: ErrorObject): void;
  onProgress?(progress: Progress): void;
  onCameraList(cameras: QrReaderCamera[]): void;
};

export const QrMultiframeSignatureReader = ({
  size = 300,
  cameraId,
  onCameraList,
  onResult,
  onProgress,
  onError,
}: Props) => {
  const status = useRef<Status>(Status.FIRST_FRAME);
  const packets = useRef<Map<string, Uint8Array>>(new Map());
  const progress = useRef({ size: 0, total: 0, collected: new Set() });
  const isComplete = useRef(false);

  const handleFirstFrame = (
    raptorDecoder: Decoder,
    blockNumber: number,
    frameData: { size: number; total: number; payload: Uint8Array },
  ) => {
    // if it's the first frame from the multiframe QR
    const fountainResult = raptorDecoder.decode(frameData.payload);

    if (fountainResult) {
      // decode the 1st frame --> it's a single frame QR
      let result;
      try {
        result = SIGNED_TRANSACTION_BULK.decode(fountainResult);
      } catch (e) {
        console.error(e);
      }

      isComplete.current = true;
      onResult?.(makeResultPayload(result?.payload));
    } else {
      // if there is more than 1 frame --> proceed scanning and keep the progress
      onProgress?.({ decoded: 1, total: frameData.total });
      status.current = Status.NEXT_FRAME;
      progress.current = {
        size: frameData.size,
        total: frameData.total,
        collected: new Set([blockNumber]),
      };
    }
  };

  const handleNextFrames = (raptorDecoder: Decoder, blockNumber: number, newSize: number) => {
    const { size, total, collected } = progress.current;

    // check if the user has started scanning another QR code
    if (size !== newSize) {
      throw QR_READER_DECODE_ERRORS[DecodeQrError.NOT_SAME_QR];
    }

    if (collected.has(blockNumber)) return;

    collected.add(blockNumber);
    onProgress?.({ decoded: collected.size, total });

    let previousPacket;
    for (const [key, packet] of packets.current) {
      let fountainResult;

      if (previousPacket && previousPacket.length > packet.length) {
        //check if packet has correct size. If not remove it and wait when get it on next QR code rotation
        packets.current.delete(key);
        collected.delete(blockNumber);
        onProgress?.({ decoded: collected.size, total });
        break;
      }

      try {
        fountainResult = raptorDecoder.decode(packet);
      } catch {
        packets.current.delete(key);
        collected.delete(blockNumber);
        onProgress?.({ decoded: collected.size, total });
        break;
      }

      if (!fountainResult) {
        previousPacket = packet;
        continue;
      }

      let result;
      try {
        result = SIGNED_TRANSACTION_BULK.decode(fountainResult);
      } catch (e) {
        console.error(e);
      }

      isComplete.current = true;

      onResult?.(makeResultPayload(result?.payload));
      break;
    }
  };

  const decodeFrame = async (result: Result): Promise<void> => {
    if (isComplete.current) return;

    try {
      await init();

      const frame = createFrame(result.getResultMetadata().get(FRAME_KEY) as Uint8Array[]);

      const stringPayload = JSON.stringify(frame.data.payload);
      const isPacketExist = packets.current.get(stringPayload);
      if (isPacketExist) return;

      packets.current.set(stringPayload, frame.data.payload);
      const decodedPacket = EncodingPacket.deserialize(frame.data.payload);
      const raptorDecoder = Decoder.with_defaults(BigInt(frame.data.size), decodedPacket.data().length);
      const blockNumber = decodedPacket.encoding_symbol_id();

      if (status.current === Status.FIRST_FRAME) {
        handleFirstFrame(raptorDecoder, blockNumber, frame.data);
      } else if (status.current === Status.NEXT_FRAME) {
        handleNextFrames(raptorDecoder, blockNumber, frame.data.size);
      }
    } catch (error) {
      if (!isQrErrorObject(error)) {
        onError?.(QR_READER_ERRORS[QrReaderErrorCode.DECODE_ERROR]);
      } else if ((error as ErrorObject).code === DecodeQrError.NOT_SAME_QR) {
        // Restart process for new QR
        packets.current = new Map();
        status.current = Status.FIRST_FRAME;
        progress.current = { size: 0, total: 0, collected: new Set() };
      } else {
        onError?.(error as ErrorObject);
      }
    }
  };

  return (
    <QrReader size={size} cameraId={cameraId} onCameraList={onCameraList} onResult={decodeFrame} onError={onError} />
  );
};
