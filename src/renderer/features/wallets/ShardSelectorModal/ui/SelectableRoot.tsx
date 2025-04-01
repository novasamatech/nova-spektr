import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { HelpText, Identicon } from '@/shared/ui';
import { Hash, RootExplorers } from '@/shared/ui-entities';
import { Checkbox } from '@/shared/ui-kit';

type Props = {
  accountId: AccountId;
  checked: boolean;
  semiChecked?: boolean;
  onChange: (value: boolean) => void;
};

export const SelectableRoot = ({ accountId, checked, semiChecked, onChange }: Props) => {
  const address = toAddress(accountId);

  return (
    <div
      className={cnTw(
        'group flex cursor-pointer gap-x-1 rounded px-2 py-1.5 transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={onChange} />

      <div className="grid w-full grid-cols-[20px,1fr,auto] items-center gap-x-2">
        <Identicon address={address} theme="jdenticon" size={20} background={false} canCopy={false} />
        <HelpText className="text-text-tertiary">
          <Hash value={address} variant="full" />
        </HelpText>
        <RootExplorers accountId={accountId} />
      </div>
    </div>
  );
};
