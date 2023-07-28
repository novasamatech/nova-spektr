import cn from 'classnames';
import React, { useState } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Shimmering } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { Button, CaptionText, FootnoteText, Select, SmallTitleText } from '@renderer/components/ui-redesign';
import SignatureReaderError from './SignatureReaderError';
import QrMultiframeSignatureReader from './QrMultiframeSignatureReader';
import { HexString } from '@renderer/domain/shared-kernel';
import { CameraError, CameraAccessErrors, WhiteTextButtonStyle } from '../common/constants';
import { ErrorObject, Progress, QrError, VideoInput } from '../common/types';
import QrSignatureReader from './QrSignatureReader';
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

const QrReaderWrapper = ({ className, onResult, countdown, validationError, isMultiFrame, onGoBack }: Props) => {
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CameraError>();
  const [progress, setProgress] = useState<Progress>();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const [activeCamera, setActiveCamera] = useState<DropdownResult<string>>();
  const [availableCameras, setAvailableCameras] = useState<DropdownOption<string>[]>([]);

  const isCameraOn = !(error && CameraAccessErrors.includes(error));

  const onCameraList = (cameras: VideoInput[]) => {
    const formattedCameras = cameras.map((camera, index) => ({
      //eslint-disable-next-line i18next/no-literal-string
      element: `${index + 1}. ${camera.label}`,
      value: camera.id,
      id: camera.id,
    }));

    setAvailableCameras(formattedCameras);

    if (formattedCameras.length > 1) {
      // if multiple cameras are available we set first one as active
      setActiveCamera(formattedCameras[0]);
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
    } catch (error) {
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

    setIsLoading(false);
  };

  const qrReaderProps: QrReaderProps = {
    size: 240,
    bgVideoClassName: 'w-[440px] h-[544px]',
    className: cnTw(
      'z-10 w-[440px] h-[544px] top-[-126px]',
      error === CameraError.INVALID_ERROR && 'blur-[13px]',
      className,
    ),
    cameraId: activeCamera?.value,
    onStart: () => setIsLoading(false),
    onCameraList,
    onError,
  };

  return (
    <div
      className={cnTw(
        'flex flex-col items-center flex-1 w-full relative pt-[52px] overflow-y-hidden',
        isLoading && 'bg-black',
      )}
    >
      <SmallTitleText as="h3" className={cnTw('z-10', isCameraOn && 'text-white')}>
        {t('signing.scanQrTitle')}
      </SmallTitleText>

      {/* countdown */}
      <div className="flex items-center gap-x-2 mt-3 mb-4.5 z-10">
        <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
        <CaptionText
          align="center"
          className={cn(
            'py-1 px-2 w-[50px] h-5 rounded-[26px] text-white',
            (countdown === 0 && 'bg-label-background-gray') ||
              (countdown >= 60 ? 'bg-label-background-green' : 'bg-label-background-red'),
          )}
        >
          {secondsToMinutes(countdown)}
        </CaptionText>
      </div>

      {/* scanning frame */}
      <div className="w-[240px] h-[240px] mb-4">
        <div className="relative">
          <div
            className={cnTw(
              'absolute w-[240px] h-[240px] z-20',
              isCameraOn ? (isSuccess ? 'border-text-positive' : 'border-white') : 'border-filter-border',
              'border-2 rounded-[22px]',
            )}
          ></div>
          <div className="z-30 absolute flex flex-col items-center justify-center gap-y-4 w-full h-[240px]">
            <SignatureReaderError error={error} isCameraOn={isCameraOn && !isLoading} onTryAgain={onRetryCamera} />
          </div>
        </div>

        {isLoading && <Shimmering width={240} height={240} className="absolute rounded-[22px]" />}

        {isCameraOn && (
          <div className={cn(isLoading && 'hidden', className)}>
            {isMultiFrame ? (
              <QrMultiframeSignatureReader {...qrReaderProps} onResult={onScanResult} onProgress={setProgress} />
            ) : (
              <QrSignatureReader {...qrReaderProps} onResult={onScanResult} />
            )}
          </div>
        )}
      </div>

      <div className="h-8.5 mb-4">
        {availableCameras && availableCameras.length > 1 && (
          <Select
            theme="dark"
            placeholder={t('onboarding.paritySigner.selectCameraLabel')}
            selectedId={activeCamera?.id}
            options={availableCameras}
            className="w-[208px]"
            onChange={setActiveCamera}
          />
        )}
      </div>

      <div className="h-9 mb-3 z-10">
        {validationError && (
          <FootnoteText className="text-white text-center max-w-[320px] h-full flex items-center justify-center ">
            {t(ValidationErrorLabels[validationError as keyof typeof ValidationErrorLabels])}
          </FootnoteText>
        )}
      </div>

      <footer className="flex w-full justify-between items-center mt-auto h-[66px] px-5 mb-1 z-10">
        {onGoBack && (
          <Button
            variant="text"
            className={cn('h-6.5 px-4', isCameraOn ? WhiteTextButtonStyle : '')}
            onClick={onGoBack}
          >
            {t('operation.goBackButton')}
          </Button>
        )}

        {progress && (
          <div className="flex items-center gap-x-2 z-10 p-1.5 pl-3 rounded-2xl bg-black-background">
            <FootnoteText className="text-text-tertiary">{t('signing.parsingLabel')}</FootnoteText>
            <CaptionText as="span" className="bg-label-background-gray text-white uppercase px-2 py-1 rounded-[26px]">
              {t('signing.parsingCount', { current: progress.decoded, total: progress.total })}
            </CaptionText>
          </div>
        )}
      </footer>
    </div>
  );
};

export default QrReaderWrapper;
