import { forwardRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon, type IconNames } from '@/shared/ui';
import { Label } from '@/shared/ui-kit';

type Props = {
  title: string;
  description: string;
  iconName: IconNames;
  disabled?: boolean;
  testId?: string;
  onClick?: VoidFunction;
};

export const WalletOnboardingCard = forwardRef<HTMLButtonElement, Props>(
  ({ title, description, iconName, disabled, onClick, testId = 'WelcomeCard' }, ref) => {
    const { t } = useI18n();

    return (
      <button
        ref={ref}
        data-testid={testId}
        disabled={disabled}
        className={cnTw(
          'flex gap-4 rounded-lg border border-filter-border px-4 py-2 shadow-none transition-shadow duration-200',
          {
            'bg-block-background-default text-text-primary shadow-card-shadow hover:shadow-card-shadow-level2':
              !disabled,
            'bg-input-background-disabled text-text-tertiary': disabled,
          },
        )}
        onClick={onClick}
      >
        <div className="py-1">
          <Icon size={56} name={iconName} />
        </div>

        <div className="flex flex-1 flex-col gap-y-1">
          <div className="flex w-full items-center justify-between">
            <BodyText className="pb-1 text-inherit">{title}</BodyText>

            {disabled ? (
              <Label variant="darkGray">{t('onboarding.welcome.soonBadge')}</Label>
            ) : (
              <Icon name="arrowRight" size={24} />
            )}
          </div>
          <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
        </div>
      </button>
    );
  },
);
