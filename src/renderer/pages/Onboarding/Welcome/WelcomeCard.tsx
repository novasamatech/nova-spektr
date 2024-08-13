import { useI18n } from '@app/providers';
import { cnTw } from '@shared/lib/utils';
import { BodyText, CaptionText, FootnoteText, Icon } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';

type Props = {
  title: string;
  description: string;
  iconName: IconNames;
  onClick?: () => void;
  disabled?: boolean;
};

export const WelcomeCard = ({ title, description, iconName, disabled, onClick }: Props) => {
  const { t } = useI18n();

  return (
    <button
      disabled={disabled}
      className={cnTw(
        'flex items-center gap-4 rounded-lg border border-filter-border px-4 py-2 shadow-card-shadow',
        !disabled && 'bg-block-background-default shadow-card-shadow hover:shadow-card-shadow-level2',
        disabled && 'bg-input-background-disabled',
      )}
      onClick={onClick}
    >
      <Icon size={56} name={iconName} />

      <div className="flex flex-1 flex-col gap-y-1">
        <div className="flex w-full items-center justify-between">
          <BodyText className={cnTw('pb-1', disabled ? 'text-text-tertiary' : 'text-text-primary')}>{title}</BodyText>

          {disabled ? (
            <CaptionText
              className="rounded-full bg-label-background-gray px-2 py-1 uppercase text-white"
              data-testid="progress"
            >
              {t('onboarding.welcome.soonBadge')}
            </CaptionText>
          ) : (
            <Icon name="arrowRight" size={24} />
          )}
        </div>
        <FootnoteText className="text-text-tertiary">{description}</FootnoteText>
      </div>
    </button>
  );
};
