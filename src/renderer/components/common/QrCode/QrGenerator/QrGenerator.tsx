import { useEffect, useRef, useState } from 'react';
import { objectSpread } from '@polkadot/util';
import { xxhashAsHex } from '@polkadot/util-crypto';
import qrcode from 'qrcode-generator';

import { DEFAULT_FRAME_DELAY, TIMER_INC } from './common/constants';
import { createFrames, createImgSize, createSignPayload } from './common/utils';

// HACK The default function take string -> number[], the Uint8array is compatible
// with that signature and the use thereof
(qrcode as any).stringToBytes = (data: Uint8Array): Uint8Array => data;
const getDataUrl = (value: Uint8Array): string => {
  const qr = qrcode(0, 'M');

  // This will only work for the case where we actually pass `Bytes` in here
  qr.addData(value as unknown as string, 'Byte');
  qr.make();

  return qr.createDataURL(16, 0);
};

type FrameState = {
  frames: Uint8Array[];
  frameIdx: number;
  image: string | null;
  valueHash: string | null;
};

type TimerState = {
  timerDelay: number;
  timerId: number | null;
};

type Props = {
  address: string;
  cmd: number; // 0 - transaction, 3 - message
  genesisHash: Uint8Array | string;
  payload: Uint8Array | string;
  size?: number;
  skipEncoding?: boolean;
  delay?: number;
};

export const QrGenerator = ({
  address,
  cmd,
  genesisHash,
  payload,
  size,
  skipEncoding,
  delay = DEFAULT_FRAME_DELAY,
}: Props) => {
  const timerRef = useRef<TimerState>({ timerDelay: delay, timerId: null });
  const [{ image }, setFrameState] = useState<FrameState>({
    frameIdx: 0,
    frames: [],
    image: null,
    valueHash: null,
  });

  const signPayload = createSignPayload(address, cmd, payload, genesisHash);

  useEffect(() => {
    const nextFrame = () =>
      setFrameState((state): FrameState => {
        // when we have a single frame, we only ever fire once
        if (state.frames.length <= 1) {
          return state;
        }

        let frameIdx = state.frameIdx + 1;

        // when we overflow, skip to the first and slightly increase the delay between frames
        if (frameIdx === state.frames.length) {
          frameIdx = 0;
          timerRef.current.timerDelay = timerRef.current.timerDelay + TIMER_INC;
        }

        // only encode the frames on demand, not above as part of the state derivation
        // in the case of large payloads, this should be slightly more responsive on initial load
        const newState = objectSpread<FrameState>({}, state, {
          frameIdx,
          image: getDataUrl(state.frames[frameIdx]),
        });

        // set the new timer last
        timerRef.current.timerId = window.setTimeout(nextFrame, timerRef.current.timerDelay);

        return newState;
      });

    timerRef.current.timerId = window.setTimeout(nextFrame, timerRef.current.timerDelay);

    return () => {
      if (timerRef.current.timerId) {
        clearTimeout(timerRef.current.timerId);
      }
    };
  }, []);

  useEffect(() => {
    setFrameState((state): FrameState => {
      const valueHash = xxhashAsHex(signPayload);

      if (valueHash === state.valueHash) {
        return state;
      }

      const frames: Uint8Array[] = skipEncoding ? [signPayload] : createFrames(signPayload);

      return {
        frames,
        valueHash,
        frameIdx: 0,
        image: getDataUrl(frames[0]),
      };
    });
  }, [skipEncoding, signPayload]);

  if (!signPayload || !image) {
    return null;
  }

  return <img src={image} alt="Generated QR code for Parity Signer" style={createImgSize(size)} />;
};

export default QrGenerator;
