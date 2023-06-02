import cn from 'classnames';
import React, { useState } from 'react';

import { QrSignatureReader } from '@renderer/components/common';
import { ErrorObject, QrError, VideoInput } from '@renderer/components/common/QrCode/QrReader/common/types';
import { Icon, Shimmering } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { Button, CaptionText, FootnoteText, Select, SmallTitleText } from '@renderer/components/ui-redesign';
import { CameraAccessErrors, CameraError, WhiteTextButtonStyle } from '../common/consts';
import cnTw from '@renderer/shared/utils/twMerge';
import SignatureReaderError from '@renderer/screens/Signing/SignatureReaderError';
import '../style.css';
import QrMultiframeSignatureReader from '@renderer/components/common/QrCode/QrReader/QrMultiframeSignatureReader';
import { HexString } from '@renderer/domain/shared-kernel';

const RESULT_DELAY = 250;

type ScanResult = HexString | HexString[];
type QrReaderProps = Omit<React.ComponentProps<typeof QrSignatureReader>, 'onResult'>;

type Props = {
  size?: number | [number, number];
  className?: string;
  countdown: number;
  validationError?: ValidationErrors;
  onResult: (payload: ScanResult) => void;
  onGoBack?: () => void;
  isMultiFrame?: boolean;
};

const QrReaderWrapper = ({
  size = 300,
  className,
  onResult,
  countdown,
  validationError,
  isMultiFrame,
  onGoBack,
}: Props) => {
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CameraError>();
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
    if (formattedCameras[0]) {
      setActiveCamera(formattedCameras[0]);
    }
  };

  // FIXME: camera is blocked after 3 denies (that's intended browser reaction)
  // Set attempts counter and show special notification
  const onRetryCamera = () => {
    setIsLoading(true);
    setError(undefined);
  };

  const onScanResult = (qrPayload: HexString | HexString[]) => {
    if (countdown === 0) {
      return;
    }

    try {
      setTimeout(() => onResult(qrPayload), RESULT_DELAY);
    } catch (error) {
      setError(CameraError.INVALID_ERROR);

      // try to scan again after 5 seconds
      setTimeout(() => setError(undefined), 5000);
    }
  };

  const onError = (error: ErrorObject) => {
    setIsLoading(false);

    if (error.code === QrError.USER_DENY) {
      setError(CameraError.DENY_ERROR);
    } else if (error.code === QrError.DECODE_ERROR) {
      setError(CameraError.DECODE_ERROR);
    } else {
      setError(CameraError.UNKNOWN_ERROR);
    }
  };

  const qrReaderProps: QrReaderProps = {
    size: 240,
    bgVideo: true,
    bgVideoClassName: 'w-[440px] h-[532px]',
    className: cnTw(
      'z-10 w-[440px] h-[532px] lef-[-100px] top-[-124px]',
      error === CameraError.INVALID_ERROR && 'blur-[13px]',
      className,
    ),
    cameraId: activeCamera?.value,
    onStart: () => setIsLoading(false),
    onCameraList: onCameraList,
    onError: onError,
  };

  return (
    <div className="flex flex-col items-center flex-1 w-full relative pt-[52px] overflow-y-hidden">
      <SmallTitleText as="h3" className={cn('z-10', activeCamera && 'text-white')}>
        {t('signing.scanQrTitle')}
      </SmallTitleText>

      {/* countdown */}
      <div className="flex items-center gap-x-2 mt-3 mb-4.5 z-10">
        <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
        <CaptionText
          className={cn(
            'py-1 px-2 w-[50px] h-5 rounded-[26px] text-button-text',
            (countdown === 0 && 'bg-label-background-gray') ||
              (countdown >= 60 ? 'bg-label-background-green' : 'bg-label-background-red'),
          )}
          align="center"
        >
          {secondsToMinutes(countdown)}
        </CaptionText>
      </div>

      {/* scanning frame */}
      <div className="w-[240px] h-[240px] mb-4">
        {!isLoading && (
          <div className="relative">
            <Icon
              name="qrFrame"
              size={240}
              className={cnTw(
                'absolute w-full h-full min-h-[240px] camera-frame z-20',
                isCameraOn ? 'text-button-text' : 'text-filter-border',
              )}
            />
            <div className="z-30 absolute flex flex-col items-center justify-center gap-y-4 w-full h-[240px]">
              <SignatureReaderError
                error={error}
                validationError={validationError}
                isCameraOn={isCameraOn && !isLoading}
                onTryAgain={onRetryCamera}
              />
            </div>
          </div>
        )}

        {isLoading && <Shimmering width={240} height={240} className="absolute rounded-[1.75rem]" />}

        {isCameraOn && (
          <div className={cn(isLoading && 'hidden', className)}>
            {!isMultiFrame ? (
              <QrSignatureReader {...qrReaderProps} onResult={onScanResult} />
            ) : (
              <QrMultiframeSignatureReader {...qrReaderProps} onResult={onScanResult} onProgress={() => {}} />
            )}
          </div>
        )}
      </div>

      {availableCameras && availableCameras.length > 1 && (
        <Select
          placeholder={t('onboarding.paritySigner.selectCameraLabel')}
          selectedId={activeCamera?.id}
          options={availableCameras}
          className="mb-4 w-[208px]"
          onChange={setActiveCamera}
        />
      )}

      <footer className="flex w-full justify-start mt-auto pt-5 pb-6 pl-7 z-10">
        {onGoBack && (
          <Button variant="text" className={cn('h-6.5', isCameraOn ? WhiteTextButtonStyle : '')} onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
      </footer>
    </div>
  );
};

export default QrReaderWrapper;
