import { t } from 'i18next';
import { type ComponentProps, useState } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ValidationErrors, cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, Countdown, FootnoteText, SmallTitleText } from '@/shared/ui';
import { type QrReaderCamera, QrReaderErrorCode, Select, ThemeProvider } from '@/shared/ui-kit';
import { CameraAccessErrors, CameraError, WhiteTextButtonStyle } from '../common/constants';
import { type ErrorObject, type Progress } from '../common/types';

import { QrMultiframeSignatureReader } from './QrMultiframeSignatureReader';
import { QrSignatureReader } from './QrSignatureReader';
import { SignatureReaderError } from './SignatureReaderError';
import './style.css';

const ValidationErrorLabels = {
  [ValidationErrors.INSUFFICIENT_BALANCE]: t('transfer.notEnoughBalanceError'),
  [ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE]: t('transfer.notEnoughBalanceForFeeError'),
  [ValidationErrors.INVALID_SIGNATURE]: t('transfer.invalidSignature'),
  [ValidationErrors.EXPIRED]: t('signing.qrNotValid'),
};

type ScanResult = HexString | HexString[];
type QrReaderProps = Omit<ComponentProps<typeof QrSignatureReader>, 'onResult'>;

type Props = {
  countdown: number;
  validationError?: ValidationErrors;
  onResult: (payload: ScanResult) => void;
  onGoBack?: () => void;
  isMultiFrame?: boolean;
};

export const QrReaderWrapper = ({ onResult, countdown, validationError, isMultiFrame, onGoBack }: Props) => {
  const { t } = useI18n();

  const [error, setError] = useState<CameraError | null>(null);
  const [progress, setProgress] = useState<Progress>();

  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);

  const isCameraOn = !error || !CameraAccessErrors.includes(error);

  const onCameraList = (cameras: QrReaderCamera[]) => {
    const formattedCameras = cameras.map((camera) => ({
      title: camera.label,
      value: camera.deviceId,
    }));

    setAvailableCameras(formattedCameras);

    const defaultCamera = formattedCameras.at(0);
    if (defaultCamera) {
      setActiveCamera(defaultCamera.value);
    }
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setError(null);
  };

  const onScanResult = (qrPayload: HexString | HexString[]) => {
    if (countdown === 0) return;

    try {
      onResult(qrPayload);
    } catch {
      setError(CameraError.INVALID_ERROR);

      // try to scan again after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const onError = (error: ErrorObject) => {
    if (error.code === QrReaderErrorCode.USER_DENY) {
      setError(CameraError.DENY_ERROR);
    } else if (error.code === QrReaderErrorCode.DECODE_ERROR) {
      setError(CameraError.DECODE_ERROR);
    } else {
      setError(CameraError.UNKNOWN_ERROR);
    }
  };

  const qrReaderProps: QrReaderProps = {
    size: [440, 544],
    cameraId: activeCamera,
    onCameraList,
    onError,
  };

  return (
    <ThemeProvider theme="dark">
      <div className="relative mt-3">
        {isMultiFrame ? (
          <QrMultiframeSignatureReader {...qrReaderProps} onResult={onScanResult} onProgress={setProgress} />
        ) : (
          <QrSignatureReader {...qrReaderProps} onResult={onScanResult} />
        )}

        <div className="absolute inset-0 z-10 flex w-full flex-1 flex-col items-center pt-16">
          <SmallTitleText as="h3" className="z-10 text-white">
            {t('signing.scanQrTitle')}
          </SmallTitleText>

          <Countdown countdown={countdown} />

          {/* scanning frame */}
          <div className="relative mt-4.5 h-[240px] w-[240px]">
            <div className="absolute inset-0 z-30">
              <SignatureReaderError error={error} onTryAgain={onRetryCamera} />
            </div>
          </div>
        </div>
        <div className="absolute top-auto bottom-0 z-10 flex w-full flex-col items-center">
          <div className="w-[240px]">
            {availableCameras.length > 1 && (
              <Select
                placeholder={t('onboarding.paritySigner.selectCameraLabel')}
                value={activeCamera ?? null}
                onChange={setActiveCamera}
              >
                {availableCameras.map((camera, index) => (
                  <Select.Item key={camera.value} value={camera.value}>
                    {`${index + 1}. ${camera.title}`}
                  </Select.Item>
                ))}
              </Select>
            )}
          </div>

          <div className="z-10 mt-3 h-4.5">
            {validationError && (
              <FootnoteText className="flex h-full max-w-[320px] items-center justify-center text-center text-white">
                {t(ValidationErrorLabels[validationError as keyof typeof ValidationErrorLabels])}
              </FootnoteText>
            )}
          </div>

          <footer className="z-10 flex w-full items-center justify-between px-5 pt-3 pb-4">
            {onGoBack && (
              <Button
                variant="text"
                className={cnTw('h-10.5 px-4', isCameraOn ? WhiteTextButtonStyle : '')}
                onClick={onGoBack}
              >
                {t('operation.goBackButton')}
              </Button>
            )}

            {progress && (
              <div className="z-10 flex items-center gap-x-2 rounded-2xl bg-black-background p-1.5 pl-3">
                <FootnoteText className="text-text-tertiary">{t('signing.parsingLabel')}</FootnoteText>
                <CaptionText
                  as="span"
                  className="rounded-[26px] bg-label-background-gray px-2 py-1 text-white uppercase"
                >
                  {t('signing.parsingCount', { current: progress.decoded, total: progress.total })}
                </CaptionText>
              </div>
            )}
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
};
