import { AccountId } from '@renderer/shared/core';
import { useRootInfo } from '@renderer/entities/wallet';
import { FootnoteText, Icon, Identicon, InfoPopover } from '@renderer/shared/ui';
import { SS58_PUBLIC_KEY_PREFIX, cnTw, toAddress } from '@renderer/shared/lib/utils';

type Props = {
  name: string;
  accountId: AccountId;
  iconSize?: number;
  className?: string;
};

export const RootAccount = ({ name, className, iconSize = 28, accountId }: Props) => {
  const address = toAddress(accountId, { prefix: SS58_PUBLIC_KEY_PREFIX });
  const popoverItems = useRootInfo({ address });

  return (
    <InfoPopover
      data={popoverItems}
      position="right-0 top-full"
      className="w-[230px]"
      buttonClassName="w-full"
      containerClassName="w-full"
    >
      <div
        className={cnTw(
          'flex items-center w-full gap-x-2 px-2 py-[3px] cursor-pointer text-text-secondary',
          'group hover:bg-action-background-hover hover:text-text-primary rounded',
          className,
        )}
      >
        <Identicon theme="jdenticon" background={false} canCopy={false} address={address} size={iconSize} />
        <div className="flex flex-col flex-1">
          <FootnoteText className="text-inherit inline w-max">{name}</FootnoteText>
        </div>
        <Icon name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
      </div>
    </InfoPopover>
  );
};
