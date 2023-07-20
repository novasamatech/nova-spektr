import { Button, FootnoteText } from '@renderer/components/ui-redesign';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { useI18n } from '@renderer/context/I18nContext';
import { CameraError, CameraErrorText } from '../common/constants';

type Props = {
  error?: CameraError;
  validationError?: ValidationErrors;
  onTryAgain: () => void;
  isCameraOn: boolean;
};

const SignatureReaderError = ({ error, validationError, onTryAgain, isCameraOn }: Props) => {
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

  if (validationError === ValidationErrors.INSUFFICIENT_BALANCE) {
    return <FootnoteText>{t('transfer.notEnoughBalanceError')}</FootnoteText>;
  }

  if (validationError === ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE) {
    return <FootnoteText>{t('transfer.notEnoughBalanceForFeeError')}</FootnoteText>;
  }

  return null;
};

export default SignatureReaderError;
