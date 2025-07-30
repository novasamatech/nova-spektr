import { cnTw } from '@/shared/lib/utils';
import { Icon, LabelText } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { Box } from '@/shared/ui-kit';

export type WalletAction = {
  icon: IconNames;
  title: string;
  onClick: VoidFunction;
  variant?: 'default' | 'danger';
};

type Props = {
  actions: WalletAction[];
};

export const WalletActions = ({ actions }: Props) => {
  const getVariantClasses = (variant: 'default' | 'danger' = 'default') => {
    const variants = {
      default: {
        background:
          'bg-secondary-button-background hover:bg-secondary-button-background-hover active:bg-secondary-button-background-active',
        icon: 'text-chip-icon',
      },
      danger: {
        background:
          'bg-secondary-negative-button-background hover:bg-secondary-negative-button-background-hover active:bg-secondary-negative-button-background-active',
        icon: 'text-icon-negative',
      },
    };

    return variants[variant];
  };

  return (
    <Box direction="row" verticalAlign="center" horizontalAlign="space-around" gap={2}>
      {actions.map(action => {
        const variantClasses = getVariantClasses(action.variant);

        return (
          <div key={action.title} className="flex flex-1 flex-col items-center gap-1">
            <button
              className={cnTw(
                'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
                variantClasses.background,
              )}
              onClick={action.onClick}
            >
              <Icon name={action.icon} size={16} className={variantClasses.icon} />
            </button>
            <LabelText>{action.title}</LabelText>
          </div>
        );
      })}
    </Box>
  );
};
