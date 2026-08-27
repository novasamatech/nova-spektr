import { CAMERA_SETTINGS_URL } from '~shared/security/externalUrlPolicy';

import { useI18n } from '@/shared/i18n';
import { getPlatformType } from '@/shared/lib/utils';
import { Button, Icon, SmallTitleText } from '@/shared/ui';

type Props = {
  status: 'denied' | 'no_input';
  onRetry: () => void;
};

export const CameraAccessAlert = ({ status, onRetry }: Props) => {
  const { t } = useI18n();

  return (
    <div className="m-auto flex h-full max-h-[240px] w-full max-w-[240px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-filter-border p-5">
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
        {status === 'denied' && (
          <>
            <SmallTitleText as="p" align="center" className="px-4">
              {t('onboarding.paritySigner.accessDeniedLabel')}
            </SmallTitleText>
            {(() => {
              const platform = getPlatformType();
              const settingsUrl =
                platform === 'desktop-mac'
                  ? CAMERA_SETTINGS_URL.MAC
                  : platform === 'desktop-windows'
                    ? CAMERA_SETTINGS_URL.WINDOWS
                    : null;

              if (platform === 'web') {
                return <p className="text-xs">{t('onboarding.paritySigner.accessDeniedDescriptionWeb')}</p>;
              }

              if (platform === 'desktop-linux') {
                return <p className="text-xs">{t('onboarding.paritySigner.accessDeniedDescriptionDesktopLinux')}</p>;
              }

              return (
                <p className="text-xs">
                  {t('onboarding.paritySigner.allowCameraPrefix')}
                  {settingsUrl && (
                    <a
                      href={settingsUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('onboarding.paritySigner.systemSettingsAria')}
                      tabIndex={0}
                      className="text-primary outline-none hover:underline focus:underline"
                    >
                      {t('onboarding.paritySigner.systemSettings')}
                    </a>
                  )}
                  {t('onboarding.paritySigner.allowCameraSuffix')}
                </p>
              );
            })()}
          </>
        )}
        {status === 'no_input' && (
          <>
            <SmallTitleText as="p" align="center" className="px-3">
              {t('onboarding.paritySigner.noVideoInputLabel')}
            </SmallTitleText>
            <p className="text-xs">{t('onboarding.paritySigner.noVideoInputDescription')}</p>
          </>
        )}
        <Button
          className="mb-5 h-[32px] w-max"
          prefixElement={<Icon size={18} name="refresh" className="text-white" />}
          onClick={onRetry}
        >
          {t('onboarding.paritySigner.tryAgainButton')}
        </Button>
      </div>
    </div>
  );
};
