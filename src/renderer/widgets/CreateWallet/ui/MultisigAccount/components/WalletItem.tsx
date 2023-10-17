import { WalletType } from '@renderer/shared/core';
import { Icon, BodyText } from '@renderer/shared/ui';

type Props = {
  name: string;
  type: WalletType;
};

// TODO: Rebuild with new components
export const WalletItem = ({ name, type }: Props) => {
  return (
    <div className="flex items-center gap-x-2 w-full">
      <Icon className="inline-block text-chip-icon" name="vault" size={20} />

      <div className="flex flex-col max-w-[348px]">
        <BodyText as="span" className="text-text-secondary tracking-tight truncate">
          {name}
        </BodyText>
      </div>
    </div>
  );
};
