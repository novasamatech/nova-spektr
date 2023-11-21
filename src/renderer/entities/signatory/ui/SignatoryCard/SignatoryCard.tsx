import { PropsWithChildren } from 'react';

import { getAddress } from '@entities/wallet';
import { useAddressInfo } from '@entities/wallet/lib/useAddressInfo';
import { InfoPopover, Icon } from '@shared/ui';
import { SigningStatus } from '@entities/transaction';
import { cnTw } from '@shared/lib/utils';
import type { Explorer } from '@shared/core';
import { AccountId } from '@shared/core';

const IconProps = {
  SIGNED: { className: 'group-hover:hidden text-text-positive', name: 'checkmarkOutline' },
  CANCELLED: { className: 'group-hover:hidden text-text-negative', name: 'closeOutline' },
} as const;

type Props = {
  explorers?: Explorer[];
  status?: SigningStatus;
  matrixId?: string;
  wrapperClassName?: string;
  accountId: AccountId;
  addressPrefix?: number;
};

export const SignatoryCard = ({
  explorers,
  status,
  matrixId,
  wrapperClassName,
  children,
  ...addressProps
}: PropsWithChildren<Props>) => {
  const address = getAddress(addressProps);
  const popoverItems = useAddressInfo({ address, explorers, showMatrix: true });

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
          'group flex gap-x-2 px-2 py-1.5 items-center cursor-pointer flex-1 hover:bg-action-background-hover text-text-secondary hover:text-text-primary rounded',
        )}
      >
        {children}
        <Icon name="info" size={16} className="text-icon-hover invisible group-hover:visible" />
        {status && status in IconProps && <Icon size={16} {...IconProps[status as keyof typeof IconProps]} />}
      </div>
    </InfoPopover>
  );
};
