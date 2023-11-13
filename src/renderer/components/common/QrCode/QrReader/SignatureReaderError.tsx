import { Button, FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { CameraError, CameraErrorText } from '../common/constants';

type Props = {
  error?: CameraError;
  onTryAgain: () => void;
  isCameraOn: boolean;
};

const SignatureReaderError = ({ error, onTryAgain, isCameraOn }: Props) => {
  const { t } = useI18n();
  const showTryAgainButton =
    error && [CameraError.UNKNOWN_ERROR, CameraError.DENY_ERROR, CameraError.DECODE_ERROR].includes(error);

  if (error) {
    return (
      <>
        <FootnoteText className={(isCameraOn && 'text-white') || ''} align="center">
          {t(CameraErrorText[error].label)}
          <br />
          {t(CameraErrorText[error].description)}
        </FootnoteText>
        {showTryAgainButton && (
          <Button size="sm" onClick={onTryAgain}>
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        )}
      </>
    );
  }

  return null;
};

export default SignatureReaderError;
