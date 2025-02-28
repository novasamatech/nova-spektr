import { type Explorer } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { HelpText, IconButton, Identicon, Truncate } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { ExplorersPopover } from '@/entities/wallet';

type Props = {
  accountId: AccountId;
  explorers?: Explorer[];
  checked: boolean;
  semiChecked?: boolean;
  truncate?: boolean;
  className?: string;
  onChange: (value: boolean) => void;
};

export const SelectableRoot = ({
  accountId,
  explorers,
  checked,
  semiChecked,
  truncate,
  className,
  onChange,
}: Props) => {
  const address = toAddress(accountId);

  const content = (
    <div className="flex items-center gap-x-2">
      <Identicon address={address} theme="jdenticon" size={20} background={false} canCopy={false} />
      <div className={cnTw('mr-auto truncate', className)}>
        {truncate ? (
          <Truncate text={address} className="text-help-text text-text-tertiary" />
        ) : (
          <HelpText className="text-text-tertiary">{address}</HelpText>
        )}
      </div>

      <IconButton name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
    </div>
  );

  return (
    <div
      className={cnTw(
        'group flex cursor-pointer gap-x-1 rounded px-2 py-1.5 transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={(checked) => onChange(checked)} />
      <ExplorersPopover button={content} address={accountId} explorers={explorers} />
    </div>
  );
};
