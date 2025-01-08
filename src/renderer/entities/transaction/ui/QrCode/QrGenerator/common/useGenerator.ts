import { objectSpread } from '@polkadot/util';
import { xxhashAsHex } from '@polkadot/util-crypto';
import { type Encoder } from 'raptorq/raptorq';
import { useEffect, useRef, useState } from 'react';

import { TIMER_INC } from './constants';
import { createFrames, getSvgString } from './utils';

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

const useGenerator = (
  payload: Uint8Array,
  skipEncoding: boolean,
  delay: number,
  bgColor: string,
  encoder?: Encoder,
): string | null => {
  const timerRef = useRef<TimerState>({ timerDelay: delay, timerId: null });

  const [{ image }, setFrameState] = useState<FrameState>({
    frameIdx: 0,
    frames: [],
    image: null,
    valueHash: null,
  });

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

          if (timerRef.current.timerDelay < 250) {
            timerRef.current.timerDelay += TIMER_INC;
          }
        }

        // only encode the frames on demand, not above as part of the state derivation
        // in the case of large payloads, this should be slightly more responsive on initial load
        const newState = objectSpread<FrameState>({}, state, {
          frameIdx,
          image: getSvgString(state.frames[frameIdx], bgColor),
        });

        // set the new timer last
        timerRef.current.timerId = window.setTimeout(nextFrame, timerRef.current.timerDelay);

        return newState;
      });

    timerRef.current.timerId = window.setTimeout(nextFrame, timerRef.current.timerDelay);

    return () => {
      if (timerRef.current.timerId) {
        clearTimeout(timerRef.current.timerId);
        timerRef.current = { timerDelay: delay, timerId: null };
      }
    };
  }, [payload]);

  useEffect(() => {
    setFrameState((state): FrameState => {
      const valueHash = xxhashAsHex(payload);

      if (valueHash === state.valueHash) {
        return state;
      }

      const frames: Uint8Array[] = skipEncoding ? [payload] : createFrames(payload, encoder);

      return {
        frames,
        valueHash,
        frameIdx: 0,
        image: getSvgString(frames[0], bgColor),
      };
    });
  }, [skipEncoding, payload]);

  return image;
};

export default useGenerator;
