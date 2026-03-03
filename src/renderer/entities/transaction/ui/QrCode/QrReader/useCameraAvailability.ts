import { useCallback, useEffect, useState } from 'react';

import { type QrReaderError, QrReaderErrorCode, getVideoDevices, requestAccess, stopMediaStream } from '@/shared/ui-kit';

type CameraStatus = 'checking' | 'available' | 'denied' | 'no_input';

export const useCameraAvailability = () => {
  const [status, setStatus] = useState<CameraStatus>('checking');

  const checkCamera = useCallback(() => {
    setStatus('checking');

    requestAccess()
      .then((stream) => {
        stopMediaStream(stream);

        return getVideoDevices();
      })
      .then(() => {
        setStatus('available');
      })
      .catch((error: QrReaderError) => {
        if (error.code === QrReaderErrorCode.NO_VIDEO_INPUT) {
          setStatus('no_input');
        } else {
          setStatus('denied');
        }
      });
  }, []);

  useEffect(() => {
    checkCamera();
  }, [checkCamera]);

  return { status, retry: checkCamera };
};
