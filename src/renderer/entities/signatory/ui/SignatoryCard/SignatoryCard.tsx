import { AccountAddress, getAddress, AccountAddressProps, useAddressInfo } from '@renderer/entities/account';
import { InfoPopover, Icon } from '@renderer/shared/ui';
import { Explorer } from '@renderer/entities/chain';
import { SigningStatus } from '@renderer/entities/transaction';
import { cnTw } from '@renderer/shared/lib/utils';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkLineRedesign' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeLineRedesign' },
} as const;

type Props = {
  explorers?: Explorer[];
  status?: SigningStatus;
  matrixId?: string;
  wrapperClassName?: string;
} & AccountAddressProps;

export const SignatoryCard = ({
  explorers,
  status,
  addressFont = 'text-body text-inherit',
  size = 20,
  name,
  matrixId,
  wrapperClassName,
  ...addressProps
}: Props) => {
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo(address, explorers, true);

  if (!popoverItems.find((item) => item.title === 'Matrix ID') && matrixId) {
    popoverItems.push({
      title: 'Matrix ID',
      items: [{ id: matrixId, value: matrixId }],
    });
  }

  return (
    <InfoPopover data={popoverItems} buttonClassName="w-full" className="w-[230px]" position="right-0 left-unset">
      <div
        className={cnTw(
          'group flex items-center justify-between cursor-pointer flex-1',
          'hover:bg-action-background-hover hover:text-text-primary text-text-secondary px-2 py-1.5 rounded',
          wrapperClassName,
        )}
      >
        <AccountAddress addressFont={addressFont} size={size} name={name} {...addressProps} />
        <Icon name="info" size={14} className="text-icon-hover invisible group-hover:visible" />
        {status && status in IconProps && <Icon size={14} {...IconProps[status as keyof typeof IconProps]} />}
      </div>
    </InfoPopover>
  );
};
