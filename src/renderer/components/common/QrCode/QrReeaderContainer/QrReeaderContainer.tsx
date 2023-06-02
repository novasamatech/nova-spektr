import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Button, CaptionText, FootnoteText, SmallTitleText } from '@renderer/components/ui-redesign';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { useI18n } from '@renderer/context/I18nContext';
import { CameraError, CameraErrorText, CameraState } from '@renderer/screens/Signing/common/consts';
import { Icon } from '@renderer/components/ui';
import cnTw from '@renderer/shared/utils/twMerge';

type Props = {
  cameraState: CameraState;
  cameraError?: CameraError;
  countdown: number;
  onTryAgain: () => void;
  onScanAgain: () => void;
  onGoBack: () => void;
};

const QrReaderContainer = ({
  countdown,
  onGoBack,
  cameraState,
  cameraError,
  onTryAgain,
  onScanAgain,
  children,
}: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const isCameraOn = cameraState === CameraState.ACTIVE;

  const showTryAgainButton =
    cameraError && [CameraError.UNKNOWN_ERROR, CameraError.DENY_ERROR, CameraError.DECODE_ERROR].includes(cameraError);
  const showScanAgainButton = cameraError === CameraError.INVALID_ERROR;

  return (
    <div className="flex flex-col items-center flex-1 relative pt-[52px]">
      <SmallTitleText className={(isCameraOn && 'text-white') || ''}>{t('signing.scanQrTitle')}</SmallTitleText>

      <div className="flex items-center gap-x-2 mt-3 mb-4.5">
        <FootnoteText className="text-text-tertiary">{t('signing.qrCountdownTitle')}</FootnoteText>
        <CaptionText
          className={cn(
            'py-1 px-2 w-[50px] h-5 rounded-[26px] text-button-text',
            ((countdown === 0 || !children) && 'bg-label-background-gray') ||
              (countdown >= 60 ? 'bg-label-background-green' : 'bg-label-background-red'),
          )}
          align="center"
        >
          {secondsToMinutes(countdown)}
        </CaptionText>
      </div>

      <div className="w-[240px] h-[240px] mb-64">
        <div className="relative w-full h-full">
          <Icon
            name="qrFrame"
            className={cnTw('absolute w-full h-full', isCameraOn ? 'text-filter-border' : 'text-white')}
          />

          {cameraError && (
            <>
              <FootnoteText className={(isCameraOn && 'text-white') || ''}>
                {t(CameraErrorText[cameraError].label)}
                <br />
                {t(CameraErrorText[cameraError].description)}
              </FootnoteText>
              {showTryAgainButton && (
                <Button size="sm" onClick={onTryAgain}>
                  {t('onboarding.paritySigner.tryAgainButton')}
                </Button>
              )}
              {showScanAgainButton && (
                <Button size="sm" onClick={onScanAgain}>
                  {t('onboarding.paritySigner.scanAgainButton')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="flex w-full justify-start">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>
      </footer>
    </div>
  );
};

export default QrReaderContainer;
