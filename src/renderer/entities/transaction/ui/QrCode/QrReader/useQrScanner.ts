import { type IScannerControls } from '@zxing/browser';
import { type MutableRefObject } from 'react';

type ScannerRefs = {
  streamRef: MutableRefObject<MediaStream | undefined>;
  controlsRef: MutableRefObject<IScannerControls | undefined>;
  bgControlsRef?: MutableRefObject<IScannerControls | undefined>;
};

export const stopScanning = async ({ streamRef, controlsRef, bgControlsRef }: ScannerRefs): Promise<void> => {
  try {
    await Promise.all([controlsRef.current?.stop(), bgControlsRef?.current?.stop()].filter(Boolean));

    if (streamRef.current) {
      const tracks = streamRef.current.getVideoTracks();
      await Promise.all(
        tracks
          .map((track) => {
            try {
              track.stop();
              return Promise.resolve();
            } catch (e) {
              console.warn('Failed to stop video track:', e);
            }
          })
          .filter(Boolean),
      );
      streamRef.current = undefined;
    }

    controlsRef.current = undefined;
    if (bgControlsRef) {
      bgControlsRef.current = undefined;
    }
  } catch (error) {
    console.warn('Error while stopping scanner:', error);
  }
};
