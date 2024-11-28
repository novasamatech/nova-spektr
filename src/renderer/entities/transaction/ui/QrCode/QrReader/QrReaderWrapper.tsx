import { useEffect, useState } from 'react';

import { type HexString } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ValidationErrors, cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, Countdown, FootnoteText, Shimmering, SmallTitleText } from '@/shared/ui';
import { Select } from '@/shared/ui-kit';
import { CameraAccessErrors, CameraError, WhiteTextButtonStyle } from '../common/constants';
import { type ErrorObject, type Progress, QrError, type VideoInput } from '../common/types';

import { QrMultiframeSignatureReader } from './QrMultiframeSignatureReader';
import { QrSignatureReader } from './QrSignatureReader';
import { SignatureReaderError } from './SignatureReaderError';

import './style.css';

const RESULT_DELAY = 250;

const ValidationErrorLabels = {
  [ValidationErrors.INSUFFICIENT_BALANCE]: 'transfer.notEnoughBalanceError',
  [ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE]: 'transfer.notEnoughBalanceForFeeError',
  [ValidationErrors.INVALID_SIGNATURE]: 'transfer.invalidSignature',
};

type ScanResult = HexString | HexString[];
type QrReaderProps = Omit<React.ComponentProps<typeof QrSignatureReader>, 'onResult'>;

type Props = {
  className?: string;
  countdown: number;
  validationError?: ValidationErrors;
  onResult: (payload: ScanResult) => void;
  onGoBack?: () => void;
  isMultiFrame?: boolean;
};

export const QrReaderWrapper = ({ className, onResult, countdown, validationError, isMultiFrame, onGoBack }: Props) => {
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CameraError>();
  const [progress, setProgress] = useState<Progress>();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const [activeCamera, setActiveCamera] = useState<string>();
  const [availableCameras, setAvailableCameras] = useState<Record<'title' | 'value', string>[]>([]);

  useEffect(() => {
    if (validationError) {
      setIsSuccess(false);
    }
  }, [validationError]);

  const isCameraOn = !(error && CameraAccessErrors.includes(error));

  const onCameraList = (cameras: VideoInput[]) => {
    const formattedCameras = cameras.map((camera) => ({
      title: camera.label,
      value: camera.id,
    }));

    setAvailableCameras(formattedCameras);

    const defaultCamera = formattedCameras.at(0);
    if (defaultCamera) {
      setActiveCamera(defaultCamera.value);
      setIsLoading(false);
    }
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setIsLoading(true);
    setError(undefined);
  };

  const onScanResult = (qrPayload: HexString | HexString[]) => {
    if (countdown === 0) return;
    setIsSuccess(true);

    try {
      setTimeout(() => onResult(qrPayload), RESULT_DELAY);
    } catch {
      setError(CameraError.INVALID_ERROR);
      setIsSuccess(false);

      // try to scan again after 5 seconds
      setTimeout(() => setError(undefined), 5000);
    }
  };

  const onError = (error: ErrorObject) => {
    if (error.code === QrError.USER_DENY) {
      setError(CameraError.DENY_ERROR);
    } else if (error.code === QrError.DECODE_ERROR) {
      setError(CameraError.DECODE_ERROR);
    } else {
      setError(CameraError.UNKNOWN_ERROR);
    }

    setIsSuccess(false);
    setIsLoading(false);
  };

  const qrReaderProps: QrReaderProps = {
    size: 240,
    bgVideoClassName: 'w-[440px] h-[544px]',
    className: cnTw(
      'top-[-126px] z-10 h-[544px] w-[440px]',
      error === CameraError.INVALID_ERROR && 'blur-[13px]',
      className,
    ),
    cameraId: activeCamera,
    onStart: () => setIsLoading(false),
    onCameraList,
    onError,
  };

  return (
    <div
      className={cnTw(
        'relative flex w-full flex-1 flex-col items-center overflow-y-hidden pt-[52px]',
        isLoading && 'bg-black',
      )}
    >
      <SmallTitleText as="h3" className={cnTw('z-10', isCameraOn && 'text-white')}>
        {t('signing.scanQrTitle')}
      </SmallTitleText>

      <Countdown countdown={countdown} />

      {/* scanning frame */}
      <div className="mb-4 h-[240px] w-[240px]">
        <div className="relative">
          <div
            className={cnTw(
              'absolute z-20 h-[240px] w-[240px]',
              isCameraOn ? (isSuccess ? 'border-text-positive' : 'border-white') : 'border-filter-border',
              'rounded-[22px] border-2',
            )}
          ></div>
          <div className="absolute z-30 flex h-[240px] w-full flex-col items-center justify-center gap-y-4">
            <SignatureReaderError error={error} isCameraOn={isCameraOn && !isLoading} onTryAgain={onRetryCamera} />
          </div>
        </div>

        {isLoading && <Shimmering width={240} height={240} className="absolute rounded-[22px]" />}

        {isCameraOn && (
          <div className={cnTw(isLoading && 'hidden', className)}>
            {isMultiFrame ? (
              <QrMultiframeSignatureReader {...qrReaderProps} onResult={onScanResult} onProgress={setProgress} />
            ) : (
              <QrSignatureReader {...qrReaderProps} onResult={onScanResult} />
            )}
          </div>
        )}
      </div>

      <div className="mb-4 w-[208px]">
        {availableCameras.length > 1 && (
          <Select
            theme="dark"
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

      <div className="z-10 mb-3 h-9">
        {validationError && (
          <FootnoteText className="flex h-full max-w-[320px] items-center justify-center text-center text-white">
            {t(ValidationErrorLabels[validationError as keyof typeof ValidationErrorLabels])}
          </FootnoteText>
        )}
      </div>

      <footer className="z-10 mb-1 mt-auto flex h-[66px] w-full items-center justify-between px-5">
        {onGoBack && (
          <Button
            variant="text"
            className={cnTw('h-6.5 px-4', isCameraOn ? WhiteTextButtonStyle : '')}
            onClick={onGoBack}
          >
            {t('operation.goBackButton')}
          </Button>
        )}

        {progress && (
          <div className="z-10 flex items-center gap-x-2 rounded-2xl bg-black-background p-1.5 pl-3">
            <FootnoteText className="text-text-tertiary">{t('signing.parsingLabel')}</FootnoteText>
            <CaptionText as="span" className="rounded-[26px] bg-label-background-gray px-2 py-1 uppercase text-white">
              {t('signing.parsingCount', { current: progress.decoded, total: progress.total })}
            </CaptionText>
          </div>
        )}
      </footer>
    </div>
  );
};
