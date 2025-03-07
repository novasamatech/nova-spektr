import { isRejected } from '@/shared/lib/utils';

import { QR_READER_ERRORS } from './errors';
import { type QrReaderCamera, type QrReaderError, QrReaderErrorCode } from './types';

export const getVideoDevices = async () => {
  const cameras: QrReaderCamera[] = [];

  const mediaDevices = await navigator.mediaDevices.enumerateDevices();
  for (const { deviceId, label, kind } of mediaDevices) {
    if (kind === 'videoinput') {
      cameras.push({ deviceId, label });
    }
  }

  if (cameras.length === 0) {
    throw QR_READER_ERRORS[QrReaderErrorCode.NO_VIDEO_INPUT];
  }

  return cameras;
};

export const getMediaStream = async (deviceId: string) => {
  return navigator.mediaDevices.getUserMedia({ video: { deviceId } }).catch(() => {
    throw QR_READER_ERRORS[QrReaderErrorCode.USER_DENY];
  });
};

export const requestAccess = async () => {
  return navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {
    throw QR_READER_ERRORS[QrReaderErrorCode.USER_DENY];
  });
};

export const stopMediaStream = async (stream: MediaStream): Promise<void> => {
  try {
    if (stream) {
      const tracks = stream.getVideoTracks();
      await Promise.allSettled(tracks.map(track => track.stop()))
        .then(res => res.filter(isRejected))
        .then(errors => {
          for (const error of errors) {
            console.error('Failed to stop video track:', error.reason);
          }
        });
    }
  } catch (error) {
    console.warn('Error while stopping scanner:', error);
  }
};

export const isQrReaderErrorObject = (error: unknown): error is QrReaderError => {
  if (!error) {
    return false;
  }

  return typeof error === 'object' && 'code' in error && 'message' in error;
};
