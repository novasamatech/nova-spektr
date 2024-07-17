import { cnTw } from '@shared/lib/utils';
import { BodyText, CaptionText, FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
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
        'flex items-center gap-4 px-4 py-2 rounded-lg border border-filter-border shadow-card-shadow',
        !disabled && 'shadow-card-shadow bg-block-background-default hover:shadow-card-shadow-level2',
        disabled && 'bg-input-background-disabled',
      )}
      onClick={onClick}
    >
      <Icon size={56} name={iconName} />

      <div className="flex-1 flex flex-col gap-y-1">
        <div className="flex justify-between items-center w-full">
          <BodyText className={cnTw('pb-1', disabled ? 'text-text-tertiary' : 'text-text-primary')}>{title}</BodyText>

          {disabled ? (
            <CaptionText
              className="text-white uppercase bg-label-background-gray px-2 py-1 rounded-full"
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
