import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, Identicon } from '@/shared/ui';
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
        'group flex cursor-pointer gap-x-2 rounded-md px-2 py-1.5 transition-colors',
        'transition-colors duration-100 hover:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={onChange} />

      <div className="flex w-full grow items-center gap-x-2 truncate">
        <Identicon address={address} theme="jdenticon" size={20} background={false} canCopy={false} />
        <FootnoteText className={cnTw('min-w-0', checked || semiChecked ? 'text-text-primary' : 'text-text-secondary')}>
          <Hash value={address} variant="truncate" />
        </FootnoteText>
        <RootExplorers accountId={accountId} />
      </div>
    </div>
  );
};
