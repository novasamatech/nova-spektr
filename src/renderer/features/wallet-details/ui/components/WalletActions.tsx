import { cnTw } from '@/shared/lib/utils';
import { Icon, LabelText } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { Box } from '@/shared/ui-kit';

export type WalletAction = {
  icon: IconNames;
  title: string;
  onClick: VoidFunction;
  iconClassName?: string;
  backgroundClassName?: string;
};

type Props = {
  actions: WalletAction[];
};

export const WalletActions = ({ actions }: Props) => {
  return (
    <Box direction="row" verticalAlign="center" horizontalAlign="space-around" gap={2}>
      {actions.map(action => (
        <button key={action.title} className="flex flex-col items-center gap-1" onClick={action.onClick}>
          <div
            className={cnTw(
              'flex h-12 w-12 items-center justify-center rounded-full bg-secondary-button-background',
              action.backgroundClassName,
            )}
          >
            <Icon name={action.icon} size={20} className={cnTw('text-chip-icon', action.iconClassName)} />
          </div>
          <LabelText>{action.title}</LabelText>
        </button>
      ))}
    </Box>
  );
};
