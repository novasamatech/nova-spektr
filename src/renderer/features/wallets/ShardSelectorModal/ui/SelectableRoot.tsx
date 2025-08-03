import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { Identicon, RootExplorers } from '@/shared/ui-entities';
import { Checkbox } from '@/shared/ui-kit';

type Props = {
  accountId: AccountId;
  accountName: string;
  checked: boolean;
  semiChecked?: boolean;
  onChange: (value: boolean) => void;
};

export const SelectableRoot = ({ accountId, accountName, checked, semiChecked, onChange }: Props) => {
  const address = toAddress(accountId);

  return (
    <div
      className={cnTw(
        'group flex cursor-pointer gap-x-2 rounded-md px-2 py-1.5 transition-colors',
        'hover:bg-action-background-hover transition-colors duration-100',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={onChange} />

      <div className="flex w-full grow items-center gap-x-2 truncate">
        <Identicon address={address} theme="jdenticon" size={20} background={false} canCopy={false} />
        <FootnoteText
          className={cnTw('min-w-0 grow', checked || semiChecked ? 'text-text-primary' : 'text-text-secondary')}
        >
          {accountName}
        </FootnoteText>
        <RootExplorers accountId={accountId} />
      </div>
    </div>
  );
};
