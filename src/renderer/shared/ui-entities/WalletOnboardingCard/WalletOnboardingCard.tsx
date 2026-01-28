import { forwardRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type IconNames, BodyText, FootnoteText, Icon } from '@/shared/ui';
import { Label } from '@/shared/ui-kit';

type Props = {
  title: string;
  description: string;
  iconName: IconNames;
  beta?: boolean;
  notInstalled?: boolean;
  soon?: boolean;
  disabled?: boolean;
  testId?: string;
  onClick?: VoidFunction;
};

export const WalletOnboardingCard = forwardRef<HTMLButtonElement, Props>(
  ({ title, beta, soon, notInstalled, description, iconName, disabled, onClick, testId = 'WelcomeCard' }, ref) => {
    const { t } = useI18n();

    let farEndLabel;

    if (soon) {
      farEndLabel = <Label variant="darkGray">{t('onboarding.welcome.soonBadge')}</Label>;
    } else if (notInstalled) {
      farEndLabel = <Label variant="darkGray">{t('onboarding.extensionNotInstalled')}</Label>;
    } else {
      farEndLabel = <Icon name="arrowRight" size={24} />;
    }

    return (
      <button
        ref={ref}
        data-testid={testId}
        disabled={disabled}
        className={cnTw(
          'flex cursor-pointer items-center gap-4 rounded-lg border border-filter-border px-4 py-2 shadow-none transition-shadow duration-200',
          {
            'bg-block-background-default text-text-primary shadow-card-shadow hover:shadow-card-shadow-level2':
              !disabled,
            'cursor-not-allowed bg-input-background-disabled text-text-tertiary': disabled,
          },
        )}
        onClick={onClick}
      >
        <div className={cnTw('py-1', { 'opacity-60': disabled })}>
          <Icon size={56} name={iconName} />
        </div>

        <div className="flex flex-1 flex-col gap-y-1">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5 pb-1">
              <BodyText className="text-inherit">{title}</BodyText>
              {beta ? <Label variant={disabled ? 'darkGray' : 'blue'}>{t('onboarding.extension.beta')}</Label> : null}
            </div>

            {farEndLabel}
          </div>
          <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
        </div>
      </button>
    );
  },
);
