import { useI18n } from '@app/providers';

import { Button, FootnoteText } from '@shared/ui';

import { CameraAccessErrors, type CameraError, CameraErrorText } from '../common/constants';

type Props = {
  error?: CameraError;
  onTryAgain: () => void;
  isCameraOn: boolean;
};

export const SignatureReaderError = ({ error, onTryAgain, isCameraOn }: Props) => {
  const { t } = useI18n();

  if (!error) {
    return null;
  }

  return (
    <>
      <FootnoteText className={(isCameraOn && 'text-white') || ''} align="center">
        {t(CameraErrorText[error].label)}
        <br />
        {t(CameraErrorText[error].description)}
      </FootnoteText>
      {CameraAccessErrors.includes(error) && (
        <Button size="sm" onClick={onTryAgain}>
          {t('onboarding.paritySigner.tryAgainButton')}
        </Button>
      )}
    </>
  );
};
