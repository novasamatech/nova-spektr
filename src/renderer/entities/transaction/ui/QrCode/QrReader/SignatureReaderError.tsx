import { useI18n } from '@/shared/i18n';
import { Button, FootnoteText } from '@/shared/ui';
import { type CameraError, CameraAccessErrors, CameraErrorText } from '../common/constants';

type Props = {
  error: CameraError | null;
  onTryAgain: () => void;
};

export const SignatureReaderError = ({ error, onTryAgain }: Props) => {
  const { t } = useI18n();

  if (!error) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-4 rounded-2lg backdrop-blur-md">
      <FootnoteText className="text-white" align="center">
        {t(CameraErrorText[error].label)}
        <br />
        {t(CameraErrorText[error].description)}
      </FootnoteText>
      {CameraAccessErrors.includes(error) && (
        <Button size="sm" onClick={onTryAgain}>
          {t('onboarding.paritySigner.tryAgainButton')}
        </Button>
      )}
    </div>
  );
};
